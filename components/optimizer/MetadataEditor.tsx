import React from 'react';
import { RefreshCw, Send, Sparkles, Plus, CheckCircle, X, Zap, Brain, HeartPulse, AlertCircle } from 'lucide-react';
import { OptimizationResult, ScoredHook } from '../../types';

interface MetadataEditorProps {
    title: string;
    description: string;
    tags: string[];
    tagInput: string;
    tagScores: Record<string, number>;
    result: OptimizationResult | null;
    loadingStates: { title: boolean, desc: boolean, tags: boolean, hooks: boolean };
    hooks: ScoredHook[];
    hookLanguage: string;
    savingPart: 'title' | 'desc' | 'tags' | 'thumbnail' | 'all' | null;
    quotaExceeded: boolean;
    onUpdate: (field: 'title' | 'description' | 'tagInput' | 'hookLanguage', value: string) => void;
    onUpdateTags: (tags: string[]) => void;
    onRegen: (type: 'title' | 'desc' | 'tags' | 'hooks') => void;
    onPublishPart: (part: { title?: boolean, desc?: boolean, tags?: boolean }) => void;
    onAddRelated: () => void;
}

const MetadataEditor: React.FC<MetadataEditorProps> = (props) => {
    const { 
        title, description, tags, tagInput, tagScores, result, loadingStates,
        savingPart, quotaExceeded,
        onUpdate, onUpdateTags, onRegen, onPublishPart, onAddRelated
    } = props;

    const isDisabled = (part: string) => savingPart !== null || quotaExceeded;

    return (
        <div className="space-y-6">
            {/* Title Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group hover:shadow-md transition">
                <div className="flex justify-between mb-3 items-center">
                    <label className="block font-bold text-gray-800 text-lg">العنوان النهائي</label>
                    <div className="flex gap-2">
                        <button onClick={() => onRegen('title')} disabled={loadingStates.title} className="text-gray-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition" title="إعادة توليد">
                            <RefreshCw size={16} className={loadingStates.title ? 'animate-spin' : ''} />
                        </button>
                        <button 
                            onClick={() => onPublishPart({title: true})} 
                            disabled={isDisabled('title')}
                            className={`text-xs px-4 py-2 rounded-lg flex items-center gap-1 font-bold transition ${isDisabled('title') ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                        >
                            {savingPart === 'title' ? <RefreshCw className="animate-spin" size={14}/> : <Send size={14}/>} تحديث
                        </button>
                    </div>
                </div>
                <input value={title} onChange={e => onUpdate('title', e.target.value)} className="w-full p-4 text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                
                {result?.optimizedTitleSuggestions && (
                    <div className="mt-5 space-y-3">
                        <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <Sparkles size={12}/> اقتراحات الذكاء الاصطناعي (مع التحليل النفسي):
                        </p>
                        <div className="grid gap-3">
                            {result.optimizedTitleSuggestions.map((item, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => onUpdate('title', item.title)} 
                                    className="group block w-full text-right bg-indigo-50/30 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-xl p-3 transition-all relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start gap-3 relative z-10">
                                        <span className="font-bold text-gray-800 text-sm leading-relaxed">{item.title}</span>
                                        <span className={`font-black px-2 py-1 rounded-md text-xs shadow-sm whitespace-nowrap ${item.score >= 90 ? 'bg-green-100 text-green-700' : 'bg-white text-indigo-600'}`}>
                                            {item.score}
                                        </span>
                                    </div>

                                    {/* Psychology Analysis Badges (New Feature) */}
                                    {item.psychology && (
                                        <div className="mt-3 pt-2 border-t border-indigo-100 grid grid-cols-2 md:grid-cols-3 gap-2 relative z-10">
                                            <div className="flex items-center gap-1.5 text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                                                <Brain size={12} />
                                                <span>فضول: {item.psychology.curiosityScore}%</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                                                <Zap size={12} />
                                                <span>عجلة: {item.psychology.urgencyScore}%</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium md:col-auto col-span-2">
                                                <HeartPulse size={12} />
                                                <span>الشعور: {item.psychology.emotionType}</span>
                                            </div>
                                            {item.psychology.analysis && (
                                                <div className="col-span-2 md:col-span-3 text-[10px] text-gray-500 mt-1 flex items-start gap-1">
                                                    <AlertCircle size={10} className="mt-0.5 flex-shrink-0"/>
                                                    <span className="line-clamp-1 group-hover:line-clamp-none transition-all">{item.psychology.analysis}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Description Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group hover:shadow-md transition">
                <div className="flex justify-between mb-3 items-center">
                    <label className="block font-bold text-gray-800 text-lg">الوصف</label>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => onRegen('desc')} disabled={loadingStates.desc} className="text-gray-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition" title="إعادة صياغة">
                            <RefreshCw size={16} className={loadingStates.desc ? 'animate-spin' : ''} />
                        </button>
                        {result?.relatedVideos && (
                            <button onClick={onAddRelated} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-100 flex items-center gap-1 font-bold transition">
                                <Plus size={14}/> إضافة روابط
                            </button>
                        )}
                        <button 
                            onClick={() => onPublishPart({desc: true})} 
                            disabled={isDisabled('desc')}
                            className={`text-xs px-4 py-2 rounded-lg flex items-center gap-1 font-bold transition ${isDisabled('desc') ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                        >
                            {savingPart === 'desc' ? <RefreshCw className="animate-spin" size={14}/> : <Send size={14}/>} تحديث
                        </button>
                    </div>
                </div>
                <textarea value={description} onChange={e => onUpdate('description', e.target.value)} rows={8} className="w-full p-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition leading-relaxed"></textarea>

                {result?.optimizedDescription && (
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 mb-2">نسخة محسنة مقترحة:</p>
                        <div className="text-xs text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">{result.optimizedDescription}</div>
                        <button onClick={() => onUpdate('description', result.optimizedDescription)} className="mt-2 text-xs text-indigo-600 font-bold hover:underline">استخدام هذا الوصف</button>
                    </div>
                )}
            </div>

            {/* Tags Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group hover:shadow-md transition">
                <div className="flex justify-between mb-3 items-center">
                    <label className="block font-bold text-gray-800 text-lg">الكلمات الدلالية ({tags.length})</label>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => onRegen('tags')} disabled={loadingStates.tags} className="text-gray-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition" title="اقتراح المزيد">
                            <RefreshCw size={16} className={loadingStates.tags ? 'animate-spin' : ''} />
                        </button>
                        <button 
                            onClick={() => onPublishPart({tags: true})} 
                            disabled={isDisabled('tags')}
                            className={`text-xs px-4 py-2 rounded-lg flex items-center gap-1 font-bold transition ${isDisabled('tags') ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                        >
                            {savingPart === 'tags' ? <RefreshCw className="animate-spin" size={14}/> : <Send size={14}/>} تحديث
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4 bg-gray-50 p-4 rounded-xl min-h-[60px] border border-gray-100">
                    {tags.map((t, i) => {
                        const score = tagScores[t] || 0;
                        let scoreColor = 'bg-gray-200 text-gray-600';
                        if (score >= 80) scoreColor = 'bg-green-100 text-green-700 border-green-200';
                        else if (score >= 50) scoreColor = 'bg-amber-100 text-amber-700 border-amber-200';
                        else if (score > 0) scoreColor = 'bg-red-100 text-red-700 border-red-200';

                        return (
                            <div key={i} className="group flex items-center gap-1 bg-white border border-gray-200 pl-1 pr-3 py-1.5 rounded-lg text-sm shadow-sm hover:border-indigo-300 transition">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${scoreColor}`}>{score > 0 ? score : '?'}</span>
                                <span>{t}</span>
                                <button onClick={() => onUpdateTags(tags.filter(tag => tag !== t))} className="text-gray-300 hover:text-red-500 p-0.5"><X size={14} /></button>
                            </div>
                        )
                    })}
                </div>
                
                <div className="relative">
                    <input 
                        value={tagInput}
                        onChange={e => onUpdate('tagInput', e.target.value)}
                        onKeyDown={e => {if(e.key === 'Enter' && tagInput.trim()){ onUpdateTags([...tags, tagInput.trim()]); onUpdate('tagInput', '') }}}
                        placeholder="أضف كلمة دلالية ثم اضغط Enter..."
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                    />
                    <Plus className="absolute right-3 top-3.5 text-gray-400" size={20} />
                </div>

                {result?.suggestedTags && result.suggestedTags.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                        <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1"><CheckCircle size={12}/> كلمات مقترحة:</p>
                        <div className="flex flex-wrap gap-2">
                            {result.suggestedTags.filter(st => !tags.includes(st.tag)).slice(0, 10).map((st, i) => (
                                <button key={i} onClick={() => onUpdateTags([...tags, st.tag])} className="text-xs bg-green-50 text-green-800 border border-green-200 px-2 py-1.5 rounded-lg hover:bg-green-100 transition flex items-center gap-1">
                                    <Plus size={12}/> {st.tag} <span className="opacity-60 text-[10px]">({st.score})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MetadataEditor;