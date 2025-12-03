import React, { useState, useEffect } from 'react';
import { ChannelProfile, AppSettings, Idea, IdeaSession } from '../types';
import { generateAdvancedIdeas, generateTrendingNiches } from '../services/geminiService';
import { NicheInputForm } from './idea-generator/NicheInputForm';
import { ResultsDisplay } from './idea-generator/ResultsDisplay';
import { SuggestedNiches } from './idea-generator/SuggestedNiches';
import { SelectedIdeas } from './idea-generator/SelectedIdeas';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SUGGESTED_NICHES_WITH_RATINGS, Niche } from '../data/niches';
import { useToast } from '../contexts/ToastContext';
import { History, Trash2, Clock, Lightbulb } from 'lucide-react';
import * as db from '../services/dbService';

interface IdeaGeneratorProps {
    profile: ChannelProfile;
}

const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ profile }) => {
    const { addToast } = useToast();
    
    // -- Core State --
    const [currentNiches, setCurrentNiches] = useState('');
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [selectedIdeas, setSelectedIdeas] = useState<Idea[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // -- Dynamic Niches State (Initialized with Static Data) --
    const [allNiches, setAllNiches] = useState<Niche[]>(SUGGESTED_NICHES_WITH_RATINGS);
    
    // -- Persistent Settings --
    const [ideaCount, setIdeaCount] = useLocalStorage('yt_idea_count', 10);
    const [positivePrompt, setPositivePrompt] = useLocalStorage('yt_pos_prompt', '');
    const [negativePrompt, setNegativePrompt] = useLocalStorage('yt_neg_prompt', 'تجنب العناوين التقليدية، تجنب الكذب');
    const [titleCaseStyle, setTitleCaseStyle] = useLocalStorage('yt_title_style', 'sentence');
    const [model, setModel] = useLocalStorage('yt_gen_model', 'gemini-2.5-flash');
    
    // -- App Level Settings (Custom Models) --
    const [customModels, setCustomModels] = useState<string[]>([]);
    
    // -- History State --
    const [history, setHistory] = useState<IdeaSession[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Load custom models from global app settings
    useEffect(() => {
        const savedSettings = localStorage.getItem('yt_analyzer_settings');
        if (savedSettings) {
            try {
                // Just for custom models reading
                const parsed: AppSettings = JSON.parse(savedSettings); 
                // In real app, this should come from context too, but keeping minimal changes
                if (parsed.customModels) setCustomModels(parsed.customModels);
            } catch (e) {}
        }
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const h = await db.getIdeaHistory();
        setHistory(h);
    };

    // -- Handlers --

    const handleGenerate = async () => {
        if (!currentNiches.trim()) return addToast("يرجى إدخال نيتش واحد على الأقل", "warning");
        
        setIsLoading(true);
        try {
            // Using the new advanced service with key rotation support
            const generated = await generateAdvancedIdeas(
                currentNiches,
                ideaCount,
                positivePrompt,
                negativePrompt,
                model,
                titleCaseStyle,
                profile.geminiApiKey // Optional: use channel-specific key if set
            );
            
            setIdeas(generated);
            
            if (generated.length > 0) {
                addToast(`تم توليد ${generated.length} فكرة بنجاح`, "success");
                
                // Save session to history via DB
                const session: IdeaSession = {
                    id: Date.now().toString(),
                    date: new Date().toLocaleString('ar-EG'),
                    niches: currentNiches,
                    count: generated.length,
                    firstIdea: generated[0].title,
                    ideas: generated
                };
                await db.saveIdeaSession(session);
                loadHistory();
            } else {
                addToast("لم يتم توليد أي نتائج، حاول تغيير النيتش أو النموذج", "warning");
            }

        } catch (e: any) {
            console.error(e);
            addToast(`حدث خطأ: ${e.message || "فشل التوليد"}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleNicheSelect = (niche: string) => {
        setCurrentNiches(prev => {
            const list = prev.split('،').map(n => n.trim()).filter(Boolean);
            if (list.includes(niche)) return prev;
            return [...list, niche].join('، ') + (list.length > 0 ? '، ' : '');
        });
    };

    const handleSelectIdea = (idea: Idea) => {
        setSelectedIdeas(prev => {
            const exists = prev.find(i => i.id === idea.id);
            if (exists) return prev.filter(i => i.id !== idea.id);
            return [...prev, idea];
        });
    };

    const loadSession = (session: IdeaSession) => {
        setCurrentNiches(Array.isArray(session.niches) ? session.niches.join('، ') : session.niches);
        setIdeas(session.ideas || []);
        setShowHistory(false);
        addToast("تم استعادة الجلسة السابقة", "info");
    };

    const handleDeleteHistory = async () => {
        if(confirm("هل أنت متأكد من مسح سجل الأفكار بالكامل؟")) {
            await db.clearIdeaHistory();
            setHistory([]);
            addToast("تم مسح السجل", "success");
        }
    };

    // --- New: Handle Category Refresh ---
    const handleRefreshCategory = async (category: string) => {
        addToast(`جاري البحث عن نيتشات تريند في قسم: ${category}...`, 'info');
        try {
            const newNiches = await generateTrendingNiches(category, profile.geminiApiKey);
            
            if (newNiches.length > 0) {
                // Map to Niche format
                const formattedNewNiches: Niche[] = newNiches.map((n, i) => ({
                    id: `dyn_${category}_${Date.now()}_${i}`,
                    name: n.name,
                    rating: n.rating,
                    category: category
                }));

                // Update state: Remove old for this category (optional) OR just prepend new ones
                setAllNiches(prev => {
                    // Filter out previous dynamic niches for this category to keep list fresh
                    // const staticNiches = prev.filter(n => !n.id.startsWith(`dyn_${category}_`));
                    // Combine: New Dynamic + Existing Static (for this category) + Other Categories
                    // Actually, simpler: Prepend new ones to the whole list
                    return [...formattedNewNiches, ...prev];
                });
                
                addToast(`تم إضافة ${newNiches.length} نيتش تريند جديد!`, 'success');
            } else {
                addToast("لم يتم العثور على نيتشات جديدة حالياً", 'warning');
            }
        } catch (e) {
            console.error(e);
            addToast("فشل تحديث النيتشات", 'error');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] pb-4 animate-fade-in">
            
            {/* Sidebar: Suggested Niches (Desktop Only) */}
            <div className="lg:w-80 flex-shrink-0 hidden lg:block h-full">
                <SuggestedNiches 
                    onNicheSelect={handleNicheSelect} 
                    allNiches={allNiches}
                    onDeleteNiche={(id) => setAllNiches(prev => prev.filter(n => n.id !== id))}
                    onRefreshCategory={handleRefreshCategory}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                     <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <Lightbulb className="text-yellow-500 fill-yellow-500" />
                        مولد الأفكار الاحترافي
                     </h2>
                     <button 
                        onClick={() => setShowHistory(!showHistory)} 
                        className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition ${showHistory ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:text-indigo-600'}`}
                     >
                         <History size={16}/> <span>السجل ({history.length})</span>
                     </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-32">
                    <NicheInputForm 
                        niches={currentNiches} 
                        setNiches={setCurrentNiches}
                        onGenerate={handleGenerate}
                        isLoading={isLoading}
                        ideaCount={ideaCount} setIdeaCount={setIdeaCount}
                        positivePrompt={positivePrompt} setPositivePrompt={setPositivePrompt}
                        negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
                        titleCaseStyle={titleCaseStyle} setTitleCaseStyle={setTitleCaseStyle}
                        customModels={customModels} selectedModel={model} setSelectedModel={setModel}
                        onSaveDefaults={() => addToast("تم حفظ الإعدادات الافتراضية", "success")}
                        profile={profile}
                    />
                    
                    <ResultsDisplay 
                        ideas={ideas} 
                        selectedIdeas={selectedIdeas} 
                        onSelectIdea={handleSelectIdea}
                        onRegenerateFromTitle={(t) => { 
                            setCurrentNiches(t); 
                            setTimeout(handleGenerate, 100); 
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isLoading={isLoading}
                        error={null}
                    />
                </div>

                {/* History Overlay Panel */}
                {showHistory && (
                    <div className="absolute top-16 right-0 left-0 bottom-0 bg-white/95 backdrop-blur-sm z-40 p-6 overflow-y-auto animate-fade-in">
                        <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2"><Clock size={18}/> جلسات التوليد السابقة</h3>
                                <div className="flex gap-2">
                                    <button onClick={handleDeleteHistory} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition" title="مسح السجل"><Trash2 size={18}/></button>
                                    <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">إغلاق</button>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                                {history.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">لا توجد جلسات محفوظة بعد.</div>
                                ) : (
                                    history.map((s) => (
                                        <div key={s.id} onClick={() => loadSession(s)} className="p-4 hover:bg-indigo-50 cursor-pointer transition group">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-gray-800 text-sm line-clamp-1">{Array.isArray(s.niches) ? s.niches.join(', ') : s.niches}</span>
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">{s.date}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs text-gray-500 line-clamp-1">{s.firstIdea}...</p>
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded group-hover:bg-white">{s.count} فكرة</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Fixed Panel for Selected Ideas */}
            <SelectedIdeas 
                selectedIdeas={selectedIdeas} 
                onReorder={(idx, dir) => {
                    const newArr = [...selectedIdeas];
                    const target = dir === 'up' ? idx - 1 : idx + 1;
                    if(target >= 0 && target < newArr.length) {
                        [newArr[idx], newArr[target]] = [newArr[target], newArr[idx]];
                        setSelectedIdeas(newArr);
                    }
                }}
                onClearSelection={() => setSelectedIdeas([])}
                onDropReorder={(dragIndex, hoverIndex) => {
                     const newArr = [...selectedIdeas];
                     const [removed] = newArr.splice(dragIndex, 1);
                     newArr.splice(hoverIndex, 0, removed);
                     setSelectedIdeas(newArr);
                }}
            />
        </div>
    );
};

export default IdeaGenerator;