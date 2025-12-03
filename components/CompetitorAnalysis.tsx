import React, { useState, useEffect } from 'react';
import { ChannelStats, ChannelProfile, CompetitorData, CompetitorAnalysisResult, SavedCompetitor } from '../types';
import { fetchCompetitorData } from '../services/youtubeService';
import { analyzeCompetitors } from '../services/geminiService';
import { Search, Users, Video, Eye, TrendingUp, Zap, Target, ShieldAlert, Award, ArrowRight, Lightbulb, Copy, CheckSquare, Square, Star, Trash2, RefreshCw, History, ExternalLink } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import Skeleton from './ui/Skeleton';
import * as db from '../services/dbService';

interface CompetitorAnalysisProps {
  myStats: ChannelStats;
  profile: ChannelProfile;
}

const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({ myStats, profile }) => {
  const [input, setInput] = useState('');
  const [competitor, setCompetitor] = useState<CompetitorData | null>(null);
  const [analysis, setAnalysis] = useState<CompetitorAnalysisResult | null>(null);
  const [selectedIdeas, setSelectedIdeas] = useState<number[]>([]);
  
  const [savedCompetitors, setSavedCompetitors] = useState<SavedCompetitor[]>([]);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  
  const { addToast } = useToast();

  useEffect(() => {
      loadSavedCompetitors();
  }, []);

  const loadSavedCompetitors = async () => {
      const saved = await db.getCompetitors();
      setSavedCompetitors(saved);
  };

  const saveCompetitor = async (comp: CompetitorData, analysisResult?: CompetitorAnalysisResult) => {
      const existingIndex = savedCompetitors.findIndex(c => c.channelId === comp.channelId);
      
      const newSaved: SavedCompetitor = {
          id: existingIndex >= 0 ? savedCompetitors[existingIndex].id : Date.now().toString(),
          channelId: comp.channelId,
          title: comp.title,
          thumbnailUrl: comp.thumbnailUrl,
          lastAnalysis: analysisResult,
          lastAnalysisDate: analysisResult ? new Date().toLocaleString() : (existingIndex >= 0 ? savedCompetitors[existingIndex].lastAnalysisDate : undefined),
          stats: comp
      };
      
      await db.saveCompetitor(newSaved);
      
      if (existingIndex >= 0) {
          addToast("تم تحديث بيانات المنافس المحفوظة", "success");
      } else {
          addToast("تمت إضافة المنافس لقائمة المراقبة", "success");
      }
      loadSavedCompetitors();
  };

  const removeCompetitor = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await db.deleteCompetitor(id);
      loadSavedCompetitors();
      addToast("تم حذف المنافس", "info");
      // If we are viewing this competitor, clear the view
      if (competitor && savedCompetitors.find(c => c.id === id)?.channelId === competitor.channelId) {
          setCompetitor(null);
          setAnalysis(null);
      }
  };

  const loadSavedCompetitor = (saved: SavedCompetitor) => {
      // Load from cache first
      if (saved.stats) setCompetitor(saved.stats);
      else {
          // Fallback if stats weren't cached in old version, treat as basic search
          handleSearch(saved.channelId);
          return;
      }

      if (saved.lastAnalysis) {
          setAnalysis(saved.lastAnalysis);
          addToast(`تم تحميل التحليل المحفوظ (${saved.lastAnalysisDate})`, "info");
      } else {
          setAnalysis(null);
      }
  };

  const handleSearch = async (query?: string) => {
      const searchTerm = query || input.trim();
      if (!searchTerm) return;
      
      setLoadingSearch(true);
      setCompetitor(null);
      setAnalysis(null);
      setSelectedIdeas([]);

      const data = await fetchCompetitorData(searchTerm, profile.apiKey);
      
      if (data) {
          setCompetitor(data);
          // Check if we have this saved, if so, load previous analysis
          const saved = savedCompetitors.find(c => c.channelId === data.channelId);
          if (saved && saved.lastAnalysis) {
               setAnalysis(saved.lastAnalysis);
               addToast("تم العثور على تحليل سابق لهذا المنافس", "info");
          } else {
               addToast("تم العثور على القناة المنافسة بنجاح", "success");
          }
      } else {
          addToast("لم يتم العثور على القناة. تأكد من المعرف أو الرابط.", "error");
      }
      setLoadingSearch(false);
  };

  const handleAnalyze = async (forceRefresh: boolean = false) => {
      if (!competitor) return;
      
      setLoadingAnalysis(true);
      try {
          const result = await analyzeCompetitors(myStats, competitor, profile.geminiApiKey);
          setAnalysis(result);
          
          // Automatically save/update the result to storage if it's already in saved list OR if we want to autosave
          // Let's autosave to history if user previously saved this competitor
          const isSaved = savedCompetitors.some(c => c.channelId === competitor.channelId);
          if (isSaved) {
              await saveCompetitor(competitor, result);
          }
          
          addToast(forceRefresh ? "تم تحديث التحليل بنجاح" : "تم استخراج التقرير الاستراتيجي", "success");
      } catch (e) {
          addToast("حدث خطأ أثناء تحليل الذكاء الاصطناعي", "error");
      }
      setLoadingAnalysis(false);
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      addToast("تم نسخ النص بنجاح", "success");
  };

  const handleCopySelected = () => {
      if (!analysis?.competitorContentIdeas) return;
      const textToCopy = selectedIdeas
        .map(i => `${analysis.competitorContentIdeas[i].title} : ${analysis.competitorContentIdeas[i].explanation}`)
        .join('\n');
      handleCopy(textToCopy);
  };

  const handleCopyAll = () => {
      if (!analysis?.competitorContentIdeas) return;
      const textToCopy = analysis.competitorContentIdeas
        .map(idea => `${idea.title} : ${idea.explanation}`)
        .join('\n');
      handleCopy(textToCopy);
  };

  const toggleSelection = (index: number) => {
      if (selectedIdeas.includes(index)) {
          setSelectedIdeas(prev => prev.filter(i => i !== index));
      } else {
          setSelectedIdeas(prev => [...prev, index]);
      }
  };

  const formatNum = (n: string | number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(Number(n));

  const isCurrentSaved = competitor ? savedCompetitors.some(c => c.channelId === competitor.channelId) : false;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        
        {/* Header & Saved Competitors */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-indigo-50 dark:border-slate-800 transition-colors">
            
            {/* Top Saved Bar */}
            {savedCompetitors.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <History size={14}/> المنافسين المحفوظين (وصول سريع)
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {savedCompetitors.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => loadSavedCompetitor(c)}
                                className={`flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group p-2 rounded-xl transition ${competitor?.channelId === c.channelId ? 'bg-indigo-50 dark:bg-slate-800 border-indigo-200 dark:border-slate-600 border' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                            >
                                <div className="relative">
                                    <img src={c.thumbnailUrl} className="w-14 h-14 rounded-full border-2 border-white dark:border-slate-700 shadow-md group-hover:scale-105 transition-transform" alt={c.title}/>
                                    <button 
                                        onClick={(e) => removeCompetitor(c.id, e)} 
                                        className="absolute -top-1 -right-1 bg-white dark:bg-slate-700 text-gray-400 hover:text-red-500 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <Trash2 size={12}/>
                                    </button>
                                </div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center truncate w-full max-w-[100px]">{c.title}</span>
                                {c.lastAnalysis && <span className="w-2 h-2 bg-green-500 rounded-full" title="يوجد تحليل محفوظ"></span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                <Target className="text-indigo-600" />
                تحليل المنافسين وكشف الفجوات
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-2xl">
                أدخل معرف القناة المنافسة (Channel ID أو Handle) وسيقوم الذكاء الاصطناعي بمقارنة أدائك معهم واقتراح خطة للتفوق عليهم.
            </p>

            <div className="flex flex-col md:flex-row gap-4">
                 <div className="flex gap-2 flex-1">
                    <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="أدخل معرف القناة (مثال: @MrBeast أو UCy...)"
                        className="flex-1 p-3 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-left font-mono bg-white dark:bg-slate-800 dark:text-white transition-colors"
                        dir="ltr"
                    />
                    <button 
                        onClick={() => handleSearch()}
                        disabled={loadingSearch}
                        className="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none whitespace-nowrap"
                    >
                        {loadingSearch ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <Search size={20} />}
                        بحث
                    </button>
                 </div>
            </div>
        </div>

        {loadingSearch && <Skeleton variant="card" className="h-48" />}

        {/* Comparison Section */}
        {competitor && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                
                {/* My Stats */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
                    <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                    <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase mb-4">قناتك</h3>
                    <div className="flex items-center gap-4 mb-6">
                        <img src={myStats.thumbnailUrl} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow" alt="Me"/>
                        <span className="font-bold text-lg dark:text-white">{myStats.title}</span>
                    </div>
                    <div className="space-y-4 dark:text-gray-300">
                        <div className="flex justify-between border-b border-dashed dark:border-slate-700 pb-2">
                            <span className="text-gray-500 dark:text-gray-500 text-sm flex items-center gap-2"><Users size={14}/> المشتركين</span>
                            <span className="font-mono font-bold">{formatNum(myStats.subscriberCount)}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed dark:border-slate-700 pb-2">
                            <span className="text-gray-500 dark:text-gray-500 text-sm flex items-center gap-2"><Eye size={14}/> المشاهدات</span>
                            <span className="font-mono font-bold">{formatNum(myStats.viewCount)}</span>
                        </div>
                    </div>
                </div>

                {/* VS Badge & Actions */}
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white w-12 h-12 rounded-full flex items-center justify-center font-black text-xl shadow-xl z-10 border-4 border-gray-100 dark:border-slate-800">
                        VS
                    </div>
                    
                    {!analysis && !loadingAnalysis && (
                        <button 
                            onClick={() => handleAnalyze(false)}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition flex items-center gap-2 text-sm whitespace-nowrap"
                        >
                            <Zap size={18}/> تحليل الفرق AI
                        </button>
                    )}

                    {analysis && !loadingAnalysis && (
                        <button 
                            onClick={() => handleAnalyze(true)}
                            className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-slate-700 px-6 py-2.5 rounded-full font-bold hover:bg-indigo-50 dark:hover:bg-slate-700 transition flex items-center gap-2 text-sm shadow-sm"
                        >
                            <RefreshCw size={16}/> إعادة التحليل
                        </button>
                    )}

                    {loadingAnalysis && (
                         <div className="flex flex-col items-center gap-2 text-indigo-600 font-bold text-sm">
                             <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                             <span>جاري الدراسة...</span>
                         </div>
                    )}
                </div>

                {/* Competitor Stats */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
                     <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase text-left">المنافس</h3>
                        <div className="flex gap-2">
                             <a href={`https://youtube.com/${competitor.customUrl}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-red-600" title="فتح القناة"><ExternalLink size={18}/></a>
                             <button 
                                onClick={() => saveCompetitor(competitor, analysis || undefined)} 
                                className="text-gray-400 hover:text-yellow-500 transition" 
                                title={isCurrentSaved ? "تحديث الحفظ" : "حفظ للمراقبة"}
                            >
                                <Star size={18} fill={isCurrentSaved ? "currentColor" : "none"} className={isCurrentSaved ? "text-yellow-500" : ""} />
                            </button>
                        </div>
                     </div>
                    <div className="flex items-center gap-4 mb-6 flex-row-reverse">
                        <img src={competitor.thumbnailUrl} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow" alt="Them"/>
                        <span className="font-bold text-lg dark:text-white">{competitor.title}</span>
                    </div>
                    <div className="space-y-4 dark:text-gray-300">
                        <div className="flex justify-between border-b border-dashed dark:border-slate-700 pb-2">
                            <span className="font-mono font-bold">{formatNum(competitor.subscriberCount)}</span>
                            <span className="text-gray-500 dark:text-gray-500 text-sm flex items-center gap-2 flex-row-reverse"><Users size={14}/> المشتركين</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed dark:border-slate-700 pb-2">
                            <span className="font-mono font-bold">{formatNum(competitor.viewCount)}</span>
                            <span className="text-gray-500 dark:text-gray-500 text-sm flex items-center gap-2 flex-row-reverse"><Eye size={14}/> المشاهدات</span>
                        </div>
                        <div className="flex justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            <span className="font-mono font-bold text-red-700 dark:text-red-400">{formatNum(competitor.recentVideoAvgViews || 0)}</span>
                            <span className="text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1 flex-row-reverse"><TrendingUp size={14}/> متوسط مشاهدات آخر فيديوهات</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* AI Results Section */}
        {analysis && (
            <div className="space-y-6 animate-fade-in-up">
                {/* Summary Card */}
                <div className="bg-indigo-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Award className="text-yellow-400" />
                            ملخص المقارنة الاستراتيجي
                        </h3>
                        {isCurrentSaved && (
                             <span className="text-[10px] bg-indigo-800 text-indigo-300 px-2 py-1 rounded border border-indigo-700">
                                 تم الحفظ تلقائياً
                             </span>
                        )}
                    </div>
                    <p className="text-indigo-100 leading-relaxed text-lg relative z-10 max-w-4xl">
                        {analysis.comparisonSummary}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths & Weaknesses */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                        <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><ShieldAlert size={18} className="text-blue-500"/> نقاط القوة والضعف</h4>
                        <div className="space-y-4">
                            <div>
                                <h5 className="text-xs font-bold text-green-600 uppercase mb-2">نقاط قوتك (تفوقك):</h5>
                                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                                    {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h5 className="text-xs font-bold text-red-600 uppercase mb-2">نقاط ضعفك (أمامهم):</h5>
                                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                    {analysis.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Opportunities & Action Plan */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                        <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Zap size={18} className="text-yellow-500"/> الفرص وخطة العمل</h4>
                        
                        <div className="mb-4">
                            <h5 className="text-xs font-bold text-purple-600 uppercase mb-2">فرص المحتوى (Gaps):</h5>
                            <div className="flex flex-wrap gap-2">
                                {analysis.opportunities.map((op, i) => (
                                    <span key={i} className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg border border-purple-100 dark:border-purple-900/30 font-medium">
                                        ✨ {op}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">خطوات عملية للتفوق:</h5>
                            {analysis.actionableTips.map((tip, i) => (
                                <div key={i} className="flex items-start gap-3 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg group hover:bg-indigo-50 dark:hover:bg-slate-700 transition border border-gray-100 dark:border-slate-700">
                                    <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i+1}</div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium group-hover:text-indigo-800 dark:group-hover:text-indigo-300">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Suggested Content Ideas from Competitor */}
                {analysis.competitorContentIdeas && analysis.competitorContentIdeas.length > 0 && (
                     <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-md border border-indigo-100 dark:border-slate-800 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
                            <div>
                                <h4 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Lightbulb className="text-yellow-500 fill-yellow-500" />
                                    أفكار فيديوهات للتفوق على المنافس
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">عناوين مقترحة بناءً على تحليل استراتيجية المنافس.</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCopyAll}
                                    className="flex items-center gap-2 bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 dark:hover:bg-slate-700 transition text-sm"
                                >
                                    <Copy size={16}/> نسخ الكل
                                </button>
                                {selectedIdeas.length > 0 && (
                                    <button 
                                        onClick={handleCopySelected}
                                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition text-sm animate-fade-in"
                                    >
                                        <Copy size={16}/> نسخ المحدد ({selectedIdeas.length})
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {analysis.competitorContentIdeas.map((idea, i) => {
                                const isSelected = selectedIdeas.includes(i);
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => toggleSelection(i)}
                                        className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start gap-4 group ${
                                            isSelected 
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500' 
                                            : 'border-gray-100 bg-gray-50 dark:bg-slate-800 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="pt-1 text-indigo-600 dark:text-indigo-400">
                                            {isSelected ? <CheckSquare size={20} fill="currentColor" className="text-indigo-100 dark:text-indigo-900" /> : <Square size={20} className="text-gray-400 dark:text-gray-600" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h5 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{idea.title}</h5>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleCopy(`${idea.title} : ${idea.explanation}`); }}
                                                    className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 opacity-0 group-hover:opacity-100 transition"
                                                    title="نسخ هذا العنوان"
                                                >
                                                    <Copy size={16}/>
                                                </button>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed border-t border-dashed border-gray-200 dark:border-slate-700 pt-2 mt-1">
                                                <span className="font-bold text-gray-400 dark:text-gray-500 ml-1">الشرح:</span> 
                                                {idea.explanation}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                     </div>
                )}
            </div>
        )}
    </div>
  );
};

export default CompetitorAnalysis;