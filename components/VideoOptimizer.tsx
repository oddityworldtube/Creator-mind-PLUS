import React, { useState, useEffect, useRef } from 'react';
import { VideoData, OptimizationResult, ChannelProfile, ScoredHook, TextObject } from '../types';
import { optimizeVideoMetadata, generateThumbnailImage, generateThumbnailHooks, evaluateMetadata, generateTitlesOnly, generateDescriptionOnly, generateTagsOnly, generateEnhancedImagePrompt } from '../services/geminiService';
import { updateVideoDetails, validateChannelToken, uploadCustomThumbnail, fetchVideoCaptions } from '../services/youtubeService';
import { CheckCircle, AlertCircle, RefreshCw, BarChart2, Send, ExternalLink, ThumbsUp, Eye, Languages, Layers, XCircle, Terminal, Activity, AlertTriangle, ChevronUp, ChevronDown, Wand2, History, Trash, Play, Type, FileText, Hash, Image as ImageIcon, ScanFace, BrainCircuit, Mic } from 'lucide-react';
import CanvasWorkspace from './optimizer/CanvasWorkspace';
import MetadataEditor from './optimizer/MetadataEditor';

interface VideoOptimizerProps {
  video: VideoData;
  profile: ChannelProfile | null;
  allVideos: VideoData[];
}

interface LogEntry {
    id: string;
    time: string;
    msg: string;
    type: 'success' | 'error' | 'info';
}

interface SavedSession {
    id: string;
    date: string;
    title: string;
    result: OptimizationResult;
    textObjects: TextObject[];
    tags: string[];
    description: string;
}

const VideoOptimizer: React.FC<VideoOptimizerProps> = ({ video, profile, allVideos }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  
  // -- Data State --
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagScores, setTagScores] = useState<Record<string, number>>({});
  const [hookLanguage, setHookLanguage] = useState('Arabic');
  const [hooks, setHooks] = useState<ScoredHook[]>([]);

  // -- UI/Loading States --
  const [evalScore, setEvalScore] = useState<{score: number, advice: string} | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState({ title: false, desc: false, tags: false, hooks: false });
  const [thumbnailMode, setThumbnailMode] = useState<'normal' | 'composite'>('normal');
  
  // Saving States
  const [savingPart, setSavingPart] = useState<'title' | 'desc' | 'tags' | 'thumbnail' | 'all' | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  
  const [actionLog, setActionLog] = useState<LogEntry[]>([]);
  const [isLogExpanded, setIsLogExpanded] = useState(false); // Default collapsed
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // -- History State --
  const [history, setHistory] = useState<SavedSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // -- Canvas State --
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [textObjects, setTextObjects] = useState<TextObject[]>([
      { id: 't1', text: "عنوان جذاب\nللفيديو", x: 640, y: 360, fontSize: 80, fontFamily: 'Cairo', color: '#ffffff', strokeColor: '#000000', strokeWidth: 4, shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 10, highlightWords: [], highlightColor: '#fbbf24', highlightScale: 1.0, lineHeight: 1.2, isDragging: false, opacity: 1, rotation: 0, align: 'center' }
  ]);
  const [selectedTextId, setSelectedTextId] = useState<string>('t1');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const draftKey = `draft_optimizer_${video.id}`;
  const historyKey = `history_optimizer_${video.id}`;

  const addLog = (msg: string, type: 'success' | 'error' | 'info') => {
      const entry: LogEntry = {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'}),
          msg,
          type
      };
      setActionLog(prev => [entry, ...prev].slice(0, 10)); // Keep last 10
      if (type !== 'info') {
          setNotification({ msg, type });
          setTimeout(() => setNotification(null), 5000);
      }
      setIsLogExpanded(true);
  };
  
  useEffect(() => {
      if (isLogExpanded) {
          const timer = setTimeout(() => { setIsLogExpanded(false); }, 10000);
          return () => clearTimeout(timer);
      }
  }, [actionLog]);

  useEffect(() => {
    const checkStatus = async () => {
        if (!profile) return;
        const check = await validateChannelToken(profile);
        if (check.status === 'QUOTA') {
            setQuotaExceeded(true);
            addLog(check.msg, 'error');
        } else if (check.status === 'AUTH') {
            addLog(check.msg, 'error');
        }
    };
    checkStatus();
    const savedHist = localStorage.getItem(historyKey);
    if (savedHist) setHistory(JSON.parse(savedHist));
  }, [profile?.id, video.id]);

  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
        try {
            const parsed = JSON.parse(savedDraft);
            setTitle(parsed.title || video.title);
            setDescription(parsed.description || video.description || '');
            setTags(parsed.tags || video.tags || []);
            if (parsed.textObjects) setTextObjects(parsed.textObjects);
            if (parsed.generatedImage) setGeneratedImage(parsed.generatedImage);
            if (parsed.analysisResult) {
                setResult(parsed.analysisResult);
                if (parsed.analysisResult.thumbnailHooks) setHooks(parsed.analysisResult.thumbnailHooks);
            }
        } catch (e) {
            resetToDefault();
        }
    } else {
        resetToDefault();
    }
  }, [video.id]);

  const resetToDefault = () => {
    setTitle(video.title);
    setDescription(video.description || '');
    setTags(video.tags || []);
    setTextObjects([{ id: 't1', text: video.title.substring(0, 20) + "...", x: 640, y: 360, fontSize: 80, fontFamily: 'Cairo', color: '#ffffff', strokeColor: '#000000', strokeWidth: 4, shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 10, highlightWords: [], highlightColor: '#fbbf24', highlightScale: 1.0, lineHeight: 1.2, isDragging: false, opacity: 1, rotation: 0, align: 'center' }]);
  };

  useEffect(() => {
      const draftData = { title, description, tags, textObjects, generatedImage, analysisResult: result };
      const timer = setTimeout(() => localStorage.setItem(draftKey, JSON.stringify(draftData)), 1000);
      return () => clearTimeout(timer);
  }, [title, description, tags, textObjects, generatedImage, result, video.id]);
  
  const saveToHistory = (res: OptimizationResult) => {
      const newSession: SavedSession = { id: Date.now().toString(), date: new Date().toLocaleString(), title: title, result: res, textObjects, tags, description };
      const updated = [newSession, ...history].slice(0, 5); 
      setHistory(updated);
      localStorage.setItem(historyKey, JSON.stringify(updated));
  };
  
  const restoreSession = (session: SavedSession) => {
      setTitle(session.title); setDescription(session.description); setTags(session.tags); setTextObjects(session.textObjects); setResult(session.result); setHooks(session.result.thumbnailHooks || []); addLog("تم استعادة جلسة تحليل سابقة", "success"); setShowHistory(false);
  };
  
  const deleteHistory = () => { if(window.confirm('هل أنت متأكد من مسح السجل؟')) { setHistory([]); localStorage.removeItem(historyKey); } };

  // --- Main Analysis Logic ---
  const runOptimization = async () => {
        if (!profile) return addLog("يرجى اختيار قناة أولاً", "error");
        setLoading(true);
        addLog("جاري بدء التحليل الذكي الشامل...", "info");
        
        try {
            // 1. Try Fetching Transcript (Captions) if available
            let videoWithContext = { ...video };
            
            // Only try fetching if we have a token (light check)
            if (profile.accessToken) {
                addLog("محاولة جلب نص الفيديو (Transcript) لفهم المحتوى...", "info");
                const captions = await fetchVideoCaptions(video.id, profile.accessToken);
                if (captions && captions.length > 0) {
                    videoWithContext.captions = captions;
                    addLog("تم جلب النص بنجاح! سيتم استخدامه في التحليل.", "success");
                } else {
                    addLog("لم يتم العثور على نص (Captions) أو لا توجد صلاحية، سيتم التحليل بناءً على الميتاداتا.", "info");
                }
            }

            // 2. Run Gemini Optimization (Vision + Transcript + Metadata)
            addLog("جاري تحليل الصور والنصوص والعناوين...", "info");
            const res = await optimizeVideoMetadata(videoWithContext, allVideos, profile?.geminiApiKey, hookLanguage);
            
            setResult(res);
            setHooks(res.thumbnailHooks || []);
            const scores: Record<string, number> = {};
            res.scoredTags.forEach(t => scores[t.tag] = t.score);
            res.suggestedTags.forEach(t => scores[t.tag] = t.score);
            setTagScores(scores);
            saveToHistory(res);
            addLog("تم اكتمال التحليل الشامل بنجاح 🚀", "success");

        } catch (e) { 
            console.error(e); 
            addLog("حدث خطأ أثناء التحليل", "error");
        }
        setLoading(false);
    };

  const handleUpdateMeta = (field: 'title' | 'description' | 'tagInput' | 'hookLanguage', value: string) => {
      if (field === 'title') setTitle(value);
      if (field === 'description') setDescription(value);
      if (field === 'tagInput') setTagInput(value);
      if (field === 'hookLanguage') setHookLanguage(value);
  };

  const handlePublish = async (parts: { title?: boolean, desc?: boolean, tags?: boolean }, isAll: boolean = false) => {
      if (!profile) return addLog("يرجى اختيار قناة من الإعدادات.", 'error');
      if (quotaExceeded) return addLog("تجاوزت الحد اليومي، لا يمكن التحديث.", "error");
      addLog("جاري إرسال التحديثات لليوتيوب...", "info");
      if (isAll) setSavingPart('all'); else if (parts.title) setSavingPart('title'); else if (parts.desc) setSavingPart('desc'); else if (parts.tags) setSavingPart('tags');
      let thumbnailBase64 = null;
      if (isAll && canvasRef.current) thumbnailBase64 = canvasRef.current.toDataURL('image/png');
      const res = await updateVideoDetails(video, { title: parts.title ? title : (isAll ? title : video.title), description: parts.desc ? description : (isAll ? description : (video.description || "")), tags: parts.tags ? tags : (isAll ? tags : (video.tags || [])), thumbnailBase64 }, profile);
      if (res.success) addLog(res.msg, 'success'); else { addLog(res.msg, 'error'); if (res.errorReason === 'quotaExceeded') setQuotaExceeded(true); }
      setSavingPart(null);
  };
  
  const handleUploadThumbnailOnly = async () => {
      if (!profile || !canvasRef.current) return;
      if (quotaExceeded) return addLog("تجاوزت الحد اليومي.", "error");
      setSavingPart('thumbnail');
      addLog("جاري رفع الصورة المصغرة فقط...", "info");
      const b64 = canvasRef.current.toDataURL('image/png');
      const res = await updateVideoDetails(video, { title: video.title, description: video.description || "", tags: video.tags || [], thumbnailBase64: b64 }, profile);
      if (res.success) addLog("تم تحديث الصورة المصغرة بنجاح!", 'success'); else addLog(res.msg, 'error');
      setSavingPart(null);
  };

  const handleRegen = async (type: 'title' | 'desc' | 'tags' | 'hooks') => {
      if (!profile) return addLog("يرجى اختيار قناة أولاً", "error");
      setLoadingStates(prev => ({ ...prev, [type]: true }));
      if (!result) { setResult({ optimizedTitleSuggestions: [], optimizedDescription: "", scoredTags: [], suggestedTags: [], thumbnailPrompt: "", thumbnailHooks: [], relatedVideos: [] }); }
      try {
          if (type === 'title') { const res = await generateTitlesOnly(title, profile?.geminiApiKey); setResult(prev => prev ? { ...prev, optimizedTitleSuggestions: res } : null); }
          else if (type === 'desc') { const res = await generateDescriptionOnly(title, description, profile?.geminiApiKey); setResult(prev => prev ? { ...prev, optimizedDescription: res } : null); }
          else if (type === 'tags') { const res = await generateTagsOnly(title, tags, profile?.geminiApiKey); setResult(prev => prev ? { ...prev, suggestedTags: res } : null); }
          else if (type === 'hooks') { const res = await generateThumbnailHooks(title, hookLanguage, profile?.geminiApiKey); setHooks(res); }
          addLog(`تم توليد اقتراحات ${type} بنجاح`, "success");
      } catch (e) { addLog("حدث خطأ أثناء التوليد", "error"); }
      setLoadingStates(prev => ({ ...prev, [type]: false }));
  };
  
  const handleInitialImageGen = () => {
       if (!result) { setResult({ optimizedTitleSuggestions: [], optimizedDescription: "", scoredTags: [], suggestedTags: [], thumbnailPrompt: video.title + " high quality background", thumbnailHooks: [], relatedVideos: [] }); }
       addLog("تم فتح محرر الصور. اضغط 'توليد AI' للبدء.", "info");
  };

  const handleEvaluate = async () => {
    setEvalLoading(true);
    const res = await evaluateMetadata(title, description, tags, profile?.geminiApiKey);
    setEvalScore(res);
    setEvalLoading(false);
  };

  const handleGenerateImage = async (settings?: {prompt: string, neg: string, style: string}) => {
    // If settings provided from advanced panel, use them. Else use defaults.
    const promptToUse = settings?.prompt || result?.thumbnailPrompt || (video.title + " youtube thumbnail background");
    setGenLoading(true);
    
    // If we have settings, pass object, otherwise pass string prompt
    const input = settings ? { prompt: settings.prompt, negativePrompt: settings.neg, style: settings.style } : promptToUse;

    const b64 = await generateThumbnailImage(input, thumbnailMode, profile?.geminiApiKey);
    if(b64) setGeneratedImage(b64);
    setGenLoading(false);
  };
  
  const handleEnhancePrompt = async (): Promise<string> => {
      return await generateEnhancedImagePrompt(title, description, profile?.geminiApiKey);
  }

  // --- Canvas Handlers (Bridge) ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    for (let i = textObjects.length - 1; i >= 0; i--) {
        const obj = textObjects[i];
        const dist = Math.sqrt(Math.pow(mouseX - obj.x, 2) + Math.pow(mouseY - obj.y, 2));
        if (dist < 200) { setSelectedTextId(obj.id); setTextObjects(prev => prev.map(t => t.id === obj.id ? { ...t, isDragging: true } : t)); setDragOffset({ x: mouseX - obj.x, y: mouseY - obj.y }); return; }
    }
    setSelectedTextId('');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const activeObj = textObjects.find(t => t.id === selectedTextId);
    if (!activeObj || !activeObj.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    setTextObjects(prev => prev.map(t => t.id === selectedTextId ? { ...t, x: mouseX - dragOffset.x, y: mouseY - dragOffset.y } : t));
  };
  
  const handleAddTextLayer = (text: string) => {
      const newId = `t${Date.now()}`;
      const newObj: TextObject = { id: newId, text: text, x: 640, y: 360, fontSize: 100, fontFamily: 'Cairo', color: '#ffffff', strokeColor: '#000000', strokeWidth: 4, shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 10, highlightWords: [], highlightColor: '#fbbf24', highlightScale: 1.0, lineHeight: 1.2, isDragging: false, opacity: 1, rotation: 0, align: 'center' };
      setTextObjects(prev => [...prev, newObj]);
      setSelectedTextId(newId);
      addLog("تمت إضافة عنوان جديد", "success");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-32">
        {notification && (
            <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-white font-bold animate-fade-in-up border border-white/20 backdrop-blur-md ${notification.type === 'success' ? 'bg-green-600/90' : 'bg-red-600/90'}`}>
                {notification.type === 'success' ? <CheckCircle size={24}/> : <XCircle size={24}/>}
                <span>{notification.msg}</span>
            </div>
        )}

        {quotaExceeded && (
             <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-lg animate-pulse">
                <AlertTriangle size={48} className="text-red-600"/>
                <div className="flex-1">
                    <h2 className="text-xl font-black text-red-800 mb-2">⛔ تم إيقاف التعديلات مؤقتاً (Quota Exceeded)</h2>
                    <p className="text-red-700">لقد استهلكت جميع وحدات YouTube API المتاحة لهذا اليوم.</p>
                </div>
             </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col xl:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-4 w-full xl:w-auto">
                 <div className="relative group rounded-lg overflow-hidden"><img src={video.thumbnail} alt={video.title} className="w-32 h-20 object-cover" /></div>
                 <div>
                     <h2 className="font-bold text-gray-900 line-clamp-1 max-w-md text-lg">{video.title}</h2>
                     <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 font-medium">
                         <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Eye size={12}/> {Number(video.viewCount).toLocaleString()}</span>
                         <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><ThumbsUp size={12}/> {Number(video.likeCount).toLocaleString()}</span>
                         {history.length > 0 && (
                            <div className="relative ml-2">
                                <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition"><History size={12}/> سجل التحليلات ({history.length})</button>
                                {showHistory && (
                                    <div className="absolute top-8 left-0 w-64 bg-white shadow-xl rounded-lg border border-gray-200 z-50 p-2">
                                        <div className="flex justify-between items-center mb-2 px-2"><span className="text-xs font-bold text-gray-500">الجلسات المحفوظة</span><button onClick={deleteHistory} className="text-red-400 hover:text-red-600"><Trash size={12}/></button></div>
                                        {history.map(s => <button key={s.id} onClick={() => restoreSession(s)} className="w-full text-right text-xs p-2 hover:bg-gray-50 rounded border-b border-gray-50 truncate"><span className="block font-bold text-gray-700">{s.date}</span><span className="text-gray-400">{s.title.substring(0, 20)}...</span></button>)}
                                    </div>
                                )}
                            </div>
                         )}
                     </div>
                 </div>
             </div>
             <div className="flex items-center gap-2 w-full xl:w-auto justify-end flex-wrap">
                <button onClick={() => { localStorage.removeItem(draftKey); addLog("تم مسح المسودة", "info"); setTimeout(() => window.location.reload(), 500); }} className="text-gray-400 hover:text-red-500 p-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50" title="إعادة تعيين"><RefreshCw size={14} /></button>
                {result && <button onClick={handleEvaluate} disabled={evalLoading} className="bg-amber-100 text-amber-800 font-bold px-4 py-2 rounded-xl hover:bg-amber-200 transition flex items-center gap-2 text-xs">{evalLoading ? <RefreshCw className="animate-spin" size={14}/> : <BarChart2 size={14}/>} تقييم الجودة</button>}
                <button onClick={() => handlePublish({}, true)} disabled={savingPart === 'all' || quotaExceeded} className={`font-bold px-5 py-2 rounded-xl shadow-md transition flex items-center gap-2 text-sm ${quotaExceeded ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{savingPart === 'all' ? <RefreshCw className="animate-spin" size={16}/> : <Send size={16} />} {savingPart === 'all' ? 'جاري النشر...' : 'نشر شامل لليوتيوب'}</button>
             </div>
        </div>

        {evalScore && <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4 animate-fade-in"><div className={`text-4xl font-black ${evalScore.score > 80 ? 'text-green-600' : 'text-orange-500'}`}>{evalScore.score}</div><div><h4 className="font-bold text-gray-800 text-sm">تحليل الجودة:</h4><p className="text-sm text-gray-600 leading-tight">{evalScore.advice}</p></div></div>}

        {!result && !loading ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
                <Wand2 size={48} className="text-indigo-200 mb-6"/>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">اختر نوع التحليل المطلوب</h3>
                <p className="text-gray-500 mb-8 max-w-md text-center">يمكنك إجراء تحليل شامل للفيديو أو اختيار أدوات محددة للسرعة.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl px-6">
                    <div className="md:col-span-2"><button onClick={runOptimization} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] transition flex items-center justify-center gap-3 text-lg border-2 border-transparent"><BrainCircuit size={24} fill="currentColor"/> <div><span className="block">التحليل الشامل العميق (Vision + Transcript)</span><span className="text-xs opacity-80 font-normal">تحليل النص، الصورة المصغرة، واقتراح تحسينات سيكولوجية</span></div></button></div>
                    <button onClick={() => handleRegen('title')} className="bg-gray-50 border border-gray-200 p-4 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition text-right group"><div className="bg-white w-10 h-10 rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:bg-indigo-600 group-hover:text-white transition"><Type size={20} /></div><h4 className="font-bold text-gray-800">تحليل العناوين فقط</h4><p className="text-xs text-gray-500 mt-1">5 عناوين فيرال مع تقييم</p></button>
                    <button onClick={() => handleRegen('desc')} className="bg-gray-50 border border-gray-200 p-4 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition text-right group"><div className="bg-white w-10 h-10 rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:bg-indigo-600 group-hover:text-white transition"><FileText size={20} /></div><h4 className="font-bold text-gray-800">تحسين الوصف</h4><p className="text-xs text-gray-500 mt-1">وصف SEO احترافي مع Hook</p></button>
                    <button onClick={() => handleRegen('tags')} className="bg-gray-50 border border-gray-200 p-4 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition text-right group"><div className="bg-white w-10 h-10 rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:bg-indigo-600 group-hover:text-white transition"><Hash size={20} /></div><h4 className="font-bold text-gray-800">الكلمات الدلالية</h4><p className="text-xs text-gray-500 mt-1">تقييم الحالي + اقتراح الجديد</p></button>
                    <button onClick={handleInitialImageGen} className="bg-gray-50 border border-gray-200 p-4 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition text-right group"><div className="bg-white w-10 h-10 rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:bg-indigo-600 group-hover:text-white transition"><ImageIcon size={20} /></div><h4 className="font-bold text-gray-800">محرر الصور المصغرة</h4><p className="text-xs text-gray-500 mt-1">توليد خلفيات وتصميم الكتابة</p></button>
                </div>
            </div>
        ) : loading ? (
             <div className="text-center py-24 bg-white rounded-2xl shadow-sm">
                 <div className="relative w-16 h-16 mx-auto mb-6">
                     <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                     <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24}/>
                 </div>
                 <h3 className="text-xl font-bold text-gray-800 animate-pulse">جاري التحليل المعمق...</h3>
                 <p className="text-gray-500 mt-2 text-sm">يقوم الذكاء الاصطناعي الآن بقراءة الفيديو وتحليل الصورة المصغرة بصرياً</p>
                 <div className="mt-4 flex gap-2 justify-center text-xs text-gray-400">
                     <span className="bg-gray-100 px-2 py-1 rounded">Vision AI</span>
                     <span className="bg-gray-100 px-2 py-1 rounded">Transcript Processing</span>
                     <span className="bg-gray-100 px-2 py-1 rounded">Psychology Check</span>
                 </div>
             </div>
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* Content Insights Card (New) */}
                    {result?.contentInsights && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm animate-fade-in">
                            <h4 className="flex items-center gap-2 font-bold text-indigo-900 mb-3 border-b border-blue-200/50 pb-2">
                                <Mic size={18} className="text-indigo-600"/> 
                                رؤى المحتوى العميق (Transcript Analysis)
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">الملخص الاستراتيجي:</span>
                                    <p className="text-sm text-indigo-800 leading-relaxed mt-1">{result.contentInsights.summary}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/60 p-2 rounded-lg">
                                        <span className="text-[10px] text-gray-500 block">النغمة (Sentiment)</span>
                                        <span className={`text-sm font-bold ${result.contentInsights.sentiment === 'Positive' ? 'text-green-600' : 'text-gray-700'}`}>{result.contentInsights.sentiment}</span>
                                    </div>
                                    <div className="bg-white/60 p-2 rounded-lg">
                                        <span className="text-[10px] text-gray-500 block">قوة الخطاف (Hook Score)</span>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{width: `${result.contentInsights.hookEffectiveness}%`}}></div>
                                            </div>
                                            <span className="text-xs font-bold">{result.contentInsights.hookEffectiveness}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">المواضيع الرئيسية:</span>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {result.contentInsights.keyTopics.map((topic, i) => (
                                            <span key={i} className="text-[10px] bg-white text-indigo-600 px-2 py-1 rounded-md border border-blue-100 font-bold shadow-sm">{topic}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <MetadataEditor 
                        title={title} 
                        description={description} 
                        tags={tags} 
                        tagInput={tagInput} 
                        tagScores={tagScores} 
                        result={result} 
                        loadingStates={loadingStates} 
                        hooks={hooks} 
                        hookLanguage={hookLanguage} 
                        onUpdate={handleUpdateMeta} 
                        onUpdateTags={setTags} 
                        onRegen={handleRegen} 
                        onPublishPart={handlePublish} 
                        savingPart={savingPart} 
                        quotaExceeded={quotaExceeded} 
                        onAddRelated={() => { if(result?.relatedVideos) setDescription(prev => prev + "\n\n📺 فيديوهات مقترحة:\n" + result.relatedVideos.map(v => `• ${v.title}\nhttps://youtu.be/${v.videoId}`).join('\n')) }} 
                    />
                </div>

                <div className="space-y-6">
                    {/* Vision Analysis Card (New) */}
                    {result?.thumbnailAnalysis && (
                        <div className="bg-gray-800 text-white rounded-xl p-5 shadow-lg border border-gray-700 animate-fade-in relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><ScanFace size={64}/></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold text-gray-200">
                                            <Eye size={18} className="text-teal-400"/> 
                                            تحليل الرؤية (Vision AI Report)
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-1">تقييم الصورة المصغرة الحالية بصرياً</p>
                                    </div>
                                    <div className="text-center bg-gray-900/50 p-2 rounded-lg border border-gray-600">
                                        <span className="block text-2xl font-black text-teal-400">{result.thumbnailAnalysis.score}</span>
                                        <span className="text-[10px] text-gray-500 uppercase">Score</span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                                    <div className="bg-gray-700/50 p-2 rounded">
                                        <span className="text-gray-400 block mb-1">وضوح النص</span>
                                        <span className={`font-bold ${result.thumbnailAnalysis.textReadability === 'High' ? 'text-green-400' : 'text-yellow-400'}`}>{result.thumbnailAnalysis.textReadability}</span>
                                    </div>
                                    <div className="bg-gray-700/50 p-2 rounded">
                                        <span className="text-gray-400 block mb-1">اكتشاف الوجوه</span>
                                        <span className="font-bold text-white">{result.thumbnailAnalysis.faceDetected ? 'نعم ✅' : 'لا ❌'}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <h5 className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1"><AlertCircle size={10}/> نقاط الضعف (Critique):</h5>
                                        <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                                            {result.thumbnailAnalysis.critique.map((c, i) => <li key={i}>{c}</li>)}
                                        </ul>
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-bold text-green-400 mb-1 flex items-center gap-1"><CheckCircle size={10}/> التحسينات المقترحة:</h5>
                                        <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                                            {result.thumbnailAnalysis.improvements.map((im, i) => <li key={i}>{im}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <CanvasWorkspace 
                        canvasRef={canvasRef} textObjects={textObjects} setTextObjects={setTextObjects} selectedTextId={selectedTextId} generatedImage={generatedImage} genLoading={genLoading}
                        suggestedHooks={hooks} thumbnailMode={thumbnailMode} setThumbnailMode={setThumbnailMode}
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setTextObjects(prev => prev.map(t => ({...t, isDragging: false})))}
                        onGenerateImage={handleGenerateImage} 
                        onEnhancePrompt={handleEnhancePrompt}
                        onDownloadImage={() => { if(canvasRef.current) { const link = document.createElement('a'); link.download = `thumb-${video.id}.png`; link.href = canvasRef.current.toDataURL(); link.click(); } }}
                        onUploadImageOnly={handleUploadThumbnailOnly}
                        isUploading={savingPart === 'thumbnail'}
                        onSelectText={setSelectedTextId}
                        onUpdateText={(k, v) => setTextObjects(prev => prev.map(t => t.id === selectedTextId ? { ...t, [k]: v } : t))}
                        onToggleHighlight={(w) => { const obj = textObjects.find(t => t.id === selectedTextId); if(obj) { const cw = w.trim().replace(/[.,!؟]/g, ''); const nh = obj.highlightWords.includes(cw) ? obj.highlightWords.filter(x => x!==cw) : [...obj.highlightWords, cw]; setTextObjects(prev => prev.map(t => t.id === selectedTextId ? { ...t, highlightWords: nh } : t)); } }}
                        onAddTextLayer={handleAddTextLayer}
                        // Pass Hooks Props
                        hookLanguage={hookLanguage}
                        setHookLanguage={(lang) => handleUpdateMeta('hookLanguage', lang)}
                        onGenerateHooks={() => handleRegen('hooks')}
                        hooksLoading={loadingStates.hooks}
                    />
                </div>
            </div>
        )}
        
        <div className={`fixed bottom-0 left-0 lg:left-72 right-0 bg-white border-t border-gray-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40 transition-all duration-300 ease-in-out ${isLogExpanded ? 'h-40' : 'h-8'}`}>
            <div className="flex items-center justify-between px-6 h-8 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition" onClick={() => setIsLogExpanded(!isLogExpanded)}>
                <div className="flex items-center gap-3"><h4 className="text-[10px] font-bold text-gray-500 flex items-center gap-2"><Activity size={12}/> سجل العمليات</h4>{!isLogExpanded && actionLog.length > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full ${actionLog[0].type === 'error' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>{actionLog[0].msg.substring(0, 50)}...</span>}</div>
                <button className="text-gray-400 hover:text-indigo-600 transition">{isLogExpanded ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}</button>
            </div>
            {isLogExpanded && <div className="h-32 overflow-y-auto p-4 space-y-2 bg-white">{actionLog.length === 0 && <p className="text-xs text-center text-gray-300 py-4">لا يوجد سجلات عمليات حالياً...</p>}{actionLog.map(log => <div key={log.id} className="flex items-start gap-3 text-xs animate-fade-in"><span className="text-gray-400 font-mono min-w-[50px]">{log.time}</span><span className={`flex-1 font-medium ${log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-green-600' : 'text-gray-600'}`}>{log.type === 'error' ? '❌ ' : log.type === 'success' ? '✅ ' : 'ℹ️ '} {log.msg}</span></div>)}</div>}
        </div>
    </div>
  );
};

export default VideoOptimizer;