import React, { useState } from 'react';
import { SparklesIcon, LoadingIcon, AdjustmentsIcon, ChevronDownIcon, SearchIcon, SaveIcon, CheckIcon, Wand2, XCircleIcon } from './Icons';
import { SUGGESTED_NICHES_WITH_RATINGS } from '../../data/niches';
import { analyzeChannelNiches } from '../../services/geminiService';
import { fetchRecentVideos, fetchVideoTitlesForAnalysis } from '../../services/youtubeService';
import { ChannelProfile } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface NicheInputFormProps {
  niches: string;
  setNiches: (niches: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  ideaCount: number;
  setIdeaCount: (count: number) => void;
  positivePrompt: string;
  setPositivePrompt: (prompt: string) => void;
  negativePrompt: string;
  setNegativePrompt: (prompt: string) => void;
  titleCaseStyle: string;
  setTitleCaseStyle: (style: string) => void;
  customModels: string[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onSaveDefaults: () => void;
  profile: ChannelProfile;
}

export const NicheInputForm: React.FC<NicheInputFormProps> = ({ 
    niches, setNiches, onGenerate, isLoading,
    ideaCount, setIdeaCount,
    positivePrompt, setPositivePrompt,
    negativePrompt, setNegativePrompt,
    titleCaseStyle, setTitleCaseStyle,
    customModels, selectedModel, setSelectedModel,
    onSaveDefaults, profile
}) => {
  const { addToast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Analysis States
  const [analyzingChannel, setAnalyzingChannel] = useState(false);
  const [analyzingExternal, setAnalyzingExternal] = useState(false);
  
  // Competitor Input UI States
  const [showCompetitorInput, setShowCompetitorInput] = useState(false);
  const [competitorInput, setCompetitorInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmedNiches = niches.trim();
      if (trimmedNiches.length > 0 && !trimmedNiches.endsWith('،')) {
          setNiches(trimmedNiches + '، ');
      }
    }
  };
  
  const handleIdeaCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    if (!isNaN(count)) {
        setIdeaCount(Math.max(5, Math.min(100, count)));
    }
  };
  
  const handleSaveClick = () => {
    onSaveDefaults();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const findRelatedNiches = () => {
    const searchTerms = niches.split('،').map(n => n.trim().toLowerCase()).filter(Boolean);
    if(searchTerms.length === 0) return;

    const related = SUGGESTED_NICHES_WITH_RATINGS.filter(niche => 
        searchTerms.some(term => niche.name.toLowerCase().includes(term))
    );

    const relatedNames = related.map(r => r.name);
    const currentNichesList = niches.split('،').map(n => n.trim()).filter(Boolean);
    const newNichesToAdd = relatedNames.filter(name => !currentNichesList.includes(name));

    if(newNichesToAdd.length > 0) {
        const updatedNiches = [...currentNichesList, ...newNichesToAdd].join('، ');
        setNiches(updatedNiches);
        addToast(`تم إضافة ${newNichesToAdd.length} نيتش مشابه`, "success");
    } else {
        addToast("لم يتم العثور على نيتشات إضافية مشابهة", "info");
    }
  };

  const handleAnalyzeMyChannel = async () => {
      setAnalyzingChannel(true);
      try {
          // 1. Fetch recent videos of current channel
          const { videos } = await fetchRecentVideos(profile.channelId, profile.apiKey, undefined, 40);
          if (videos.length === 0) {
              addToast("لا توجد فيديوهات في القناة لتحليلها", "warning");
              return;
          }
          // 2. Analyze
          const extractedNiches = await analyzeChannelNiches(videos, profile.geminiApiKey);
          if (extractedNiches.length > 0) {
              const currentList = niches ? niches.split('،').map(s=>s.trim()).filter(Boolean) : [];
              const combined = Array.from(new Set([...currentList, ...extractedNiches])).join('، ');
              setNiches(combined);
              addToast("تم استخراج نيتشات قناتك بنجاح!", "success");
          } else {
              addToast("لم يتم استخراج أي نيتشات واضحة.", "warning");
          }
      } catch (e) {
          addToast("حدث خطأ أثناء تحليل القناة", "error");
      }
      setAnalyzingChannel(false);
  };

  const executeCompetitorAnalysis = async () => {
      if (!competitorInput.trim()) {
          addToast("يرجى إدخال معرف القناة أو الرابط", "warning");
          return;
      }

      setAnalyzingExternal(true);
      try {
          // 1. Fetch videos by handle/ID
          const videos = await fetchVideoTitlesForAnalysis(competitorInput.trim(), profile.apiKey);
          if (videos.length === 0) {
              addToast("لم يتم العثور على القناة أو فيديوهات.", "error");
              setAnalyzingExternal(false);
              return;
          }
          // 2. Analyze
          const extractedNiches = await analyzeChannelNiches(videos, profile.geminiApiKey);
          if (extractedNiches.length > 0) {
              const currentList = niches ? niches.split('،').map(s=>s.trim()).filter(Boolean) : [];
              const combined = Array.from(new Set([...currentList, ...extractedNiches])).join('، ');
              setNiches(combined);
              addToast(`تم استخراج نيتشات القناة ${competitorInput} بنجاح!`, "success");
              setShowCompetitorInput(false); // Close input on success
              setCompetitorInput('');
          } else {
              addToast("لم يتمكن الذكاء الاصطناعي من تحديد نيتشات واضحة لهذه القناة", "warning");
          }
      } catch (e) {
          addToast("فشل تحليل القناة الخارجية. تأكد من صحة المعرف.", "error");
      }
      setAnalyzingExternal(false);
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-3">
          <label htmlFor="niches" className="block text-lg font-bold text-gray-800 whitespace-nowrap">
            أدخل النيتشات (اضغط Enter للفصل بينهم)
          </label>
          
          <div className="w-full md:w-auto">
              {!showCompetitorInput ? (
                  <div className="flex gap-2 w-full">
                      <button 
                        onClick={handleAnalyzeMyChannel}
                        disabled={analyzingChannel || isLoading}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-bold transition border border-indigo-200 whitespace-nowrap"
                        title="تحليل قناتي واستخراج النيتشات"
                      >
                          {analyzingChannel ? <LoadingIcon className="h-3 w-3 animate-spin"/> : <Wand2 className="h-3 w-3" />}
                          تحليل قناتي
                      </button>
                      <button 
                        onClick={() => setShowCompetitorInput(true)}
                        disabled={analyzingExternal || isLoading}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-bold transition border border-gray-200 whitespace-nowrap"
                        title="تحليل قناة منافسة"
                      >
                          <SearchIcon className="h-3 w-3" />
                          تحليل منافس
                      </button>
                  </div>
              ) : (
                  <div className="flex items-center gap-2 w-full md:w-auto animate-fade-in">
                      <div className="relative flex-1 md:w-64">
                        <input 
                            value={competitorInput}
                            onChange={(e) => setCompetitorInput(e.target.value)}
                            placeholder="رابط القناة أو المعرف (@handle)..."
                            className="w-full text-xs p-1.5 pl-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && executeCompetitorAnalysis()}
                        />
                      </div>
                      <button 
                        onClick={executeCompetitorAnalysis}
                        disabled={analyzingExternal}
                        className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-50"
                      >
                          {analyzingExternal ? <LoadingIcon className="h-3 w-3 animate-spin"/> : <CheckIcon className="h-3 w-3"/>}
                      </button>
                      <button 
                        onClick={() => { setShowCompetitorInput(false); setCompetitorInput(''); }}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                          <XCircleIcon className="h-4 w-4"/>
                      </button>
                  </div>
              )}
          </div>
      </div>
      
      <div className="relative group">
        <textarea
          id="niches"
          value={niches}
          onChange={(e) => setNiches(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="مثال: الطبخ الصحي، السفر الاقتصادي، تطوير الذات"
          rows={3}
          className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors placeholder-gray-400 resize-none text-gray-800 font-medium"
          disabled={isLoading}
        />
        <button 
          onClick={findRelatedNiches}
          disabled={isLoading || !niches.trim()}
          title="ابحث عن نيتشات مشابهة من القائمة المقترحة"
          className="absolute bottom-3 left-3 bg-white border border-gray-200 hover:border-indigo-400 text-gray-500 hover:text-indigo-600 p-2 rounded-lg transition-all shadow-sm disabled:opacity-50"
        >
            <SearchIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition">
            <AdjustmentsIcon className="h-5 w-5" />
            <span className="font-bold text-sm">خيارات التوليد المتقدمة</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
        {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-5 bg-gray-50 rounded-xl border border-gray-200 animate-fade-in-down">
                <div>
                    <label htmlFor="ideaCount" className="block text-xs font-bold text-gray-500 mb-2">
                        عدد العناوين المطلوبة ({ideaCount})
                    </label>
                    <input
                        type="range" id="ideaCount" min="5" max="100" step="5" value={ideaCount}
                        onChange={handleIdeaCountChange}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="positivePrompt" className="block text-xs font-bold text-gray-500 mb-2">
                        التركيز على (برومبت إيجابي)
                    </label>
                    <input
                        type="text" id="positivePrompt" value={positivePrompt} onChange={(e) => setPositivePrompt(e.target.value)}
                        placeholder="مثال: للمبتدئين، بدون تكلفة"
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        disabled={isLoading}
                    />
                </div>
                <div className="md:col-span-2">
                     <label htmlFor="negativePrompt" className="block text-xs font-bold text-gray-500 mb-2">
                        تجنب (برومبت سلبي)
                    </label>
                    <input
                        type="text" id="negativePrompt" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="مثال: أدوات مدفوعة، للمحترفين"
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        disabled={isLoading}
                    />
                </div>
                
                {/* Model Selection */}
                <div>
                    <label htmlFor="model" className="block text-xs font-bold text-gray-500 mb-2">
                        نموذج الذكاء الاصطناعي
                    </label>
                    <select
                        id="model"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700"
                        disabled={isLoading}
                    >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                        {customModels.filter(m => !['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'].includes(m)).map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {/* Title Case Style */}
                <div>
                    <label htmlFor="titleCase" className="block text-xs font-bold text-gray-500 mb-2">
                        نمط العناوين
                    </label>
                    <select
                        id="titleCase"
                        value={titleCaseStyle}
                        onChange={(e) => setTitleCaseStyle(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700"
                        disabled={isLoading}
                    >
                        <option value="sentence">Sentence case (افتراضي)</option>
                        <option value="title">Title Case</option>
                        <option value="allcaps">ALL CAPS</option>
                    </select>
                </div>

                <div className="md:col-span-2 flex justify-end">
                    <button onClick={handleSaveClick} className={`flex items-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors text-sm shadow-sm ${isSaved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {isSaved ? <CheckIcon className="h-4 w-4" /> : <SaveIcon className="h-4 w-4" />}
                        <span>{isSaved ? 'تم الحفظ!' : 'حفظ كإعدادات افتراضية'}</span>
                    </button>
                </div>
            </div>
        )}
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading || !niches.trim()}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5"
      >
        {isLoading ? (
          <><LoadingIcon className="animate-spin h-5 w-5" /> جاري التوليد بذكاء...</>
        ) : (
          <><SparklesIcon className="h-5 w-5" /> توليد الأفكار الآن</>
        )}
      </button>
    </div>
  );
};