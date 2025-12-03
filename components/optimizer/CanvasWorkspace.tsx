import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Download, RefreshCw, Sparkles, Image as ImageIcon, Type, X, Palette, AlignLeft, AlignCenter, AlignRight, PlusCircle, Move, MousePointerClick, CloudUpload, Film, ImagePlus, Undo, Redo, Layout, Lock, EyeOff, Maximize2, Minimize2, Sliders, ChevronDown, ChevronUp, Wand2, Languages, Grid, Crosshair } from 'lucide-react';
import { ScoredHook, TextObject, CanvasTemplate } from '../../types';
import LayerPanel from './LayerPanel';

interface CanvasWorkspaceProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    textObjects: TextObject[];
    setTextObjects: React.Dispatch<React.SetStateAction<TextObject[]>>; 
    selectedTextId: string;
    generatedImage: string | null;
    genLoading: boolean;
    suggestedHooks: ScoredHook[];
    thumbnailMode: 'normal' | 'composite';
    setThumbnailMode: (m: 'normal' | 'composite') => void;
    isUploading: boolean;
    // New Props for Hooks
    hookLanguage: string;
    setHookLanguage: (lang: string) => void;
    onGenerateHooks: () => void;
    hooksLoading: boolean;

    onGenerateImage: (settings?: {prompt: string, neg: string, style: string}) => void;
    onEnhancePrompt?: () => Promise<string>;
    onDownloadImage: () => void;
    onUploadImageOnly: () => void;
    onSelectText: (id: string) => void;
    onMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onMouseUp?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onMouseLeave?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onUpdateText?: (key: keyof TextObject, value: any) => void;
    onToggleHighlight?: (word: string) => void;
    onAddTextLayer?: (text: string) => void;
}

const FONTS = [
    { name: 'Cairo', val: 'Cairo' },
    { name: 'Tajawal', val: 'Tajawal' },
    { name: 'Changa', val: 'Changa' },
    { name: 'IBM Plex Arabic', val: 'IBM Plex Sans Arabic' },
    { name: 'Oswald', val: 'Oswald' },
    { name: 'Sans Serif', val: 'sans-serif' }
];

const STYLES = [
    { label: 'افتراضي (YouTube Standard)', val: 'High Quality YouTube Thumbnail, Bright, Sharp Focus, Vivid Colors' },
    { label: 'سينمائي (Cinematic)', val: 'Cinematic, Dramatic Lighting, 8k, Unreal Engine 5, Depth of Field' },
    { label: 'كرتوني (Cartoon/3D)', val: 'Pixar Style, 3D Render, Cute, Vibrant, Smooth' },
    { label: 'نيون (Cyberpunk)', val: 'Cyberpunk, Neon Lights, Dark Background, Futuristic, Glowing' },
    { label: 'واقعي جداً (Photorealistic)', val: 'Hyper-realistic, Macro Photography, Highly Detailed, 8k' },
    { label: 'كوميك (Comic Book)', val: 'Comic Book Style, Bold Lines, Pop Art, Halftone' }
];

const TEMPLATES: CanvasTemplate[] = [
    {
        id: 't_vs', name: 'مقارنة (VS)', previewColor: '#ef4444',
        objects: [
            { text: "VS", x: 640, y: 360, fontSize: 120, color: '#ffffff', strokeColor: '#000000', strokeWidth: 8, highlightWords: [], rotation: 0 },
            { text: "المنتج الأول", x: 300, y: 360, fontSize: 60, color: '#fbbf24', strokeColor: '#000000', strokeWidth: 4, rotation: -5 },
            { text: "المنتج الثاني", x: 980, y: 360, fontSize: 60, color: '#fbbf24', strokeColor: '#000000', strokeWidth: 4, rotation: 5 }
        ]
    },
    {
        id: 't_top', name: 'قائمة أفضل 5', previewColor: '#3b82f6',
        objects: [
            { text: "أفضل 5", x: 640, y: 200, fontSize: 100, color: '#ffffff', strokeColor: '#2563eb', strokeWidth: 4, highlightWords: ['5'], highlightColor: '#fbbf24', highlightScale: 1.2 },
            { text: "هواتف في 2025", x: 640, y: 450, fontSize: 70, color: '#e5e7eb', strokeColor: '#000000', strokeWidth: 3 }
        ]
    },
    {
        id: 't_react', name: 'رده فعل (Shock)', previewColor: '#eab308',
        objects: [
            { text: "مستحيل !!", x: 640, y: 600, fontSize: 110, color: '#facc15', strokeColor: '#000000', strokeWidth: 6, rotation: 0, highlightWords: ['!!'], highlightColor: '#ef4444' }
        ]
    }
];

const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = (props) => {
    const {
        canvasRef, textObjects, setTextObjects, selectedTextId, generatedImage, genLoading, suggestedHooks,
        thumbnailMode, setThumbnailMode, isUploading,
        hookLanguage, setHookLanguage, onGenerateHooks, hooksLoading,
        onGenerateImage, onEnhancePrompt, onDownloadImage, onUploadImageOnly, onSelectText,
        onAddTextLayer: parentOnAddTextLayer,
        onUpdateText: parentOnUpdateText,
        onToggleHighlight: parentOnToggleHighlight
    } = props;

    // --- State ---
    const [history, setHistory] = useState<TextObject[][]>([]);
    const [future, setFuture] = useState<TextObject[][]>([]);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [showTemplates, setShowTemplates] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    
    // Snapping State
    const [snapLines, setSnapLines] = useState<{ x?: number, y?: number }>({});

    // Advanced Generation State
    const [showAdvancedGen, setShowAdvancedGen] = useState(false);
    const [positivePrompt, setPositivePrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('text, letters, words, watermark, logo, signature, bad anatomy, blurry, low quality, distortion, ugly face, extra fingers');
    const [imgStyle, setImgStyle] = useState(STYLES[0].val);
    const [enhancingPrompt, setEnhancingPrompt] = useState(false);

    // --- Effects ---

    // Auto-fill Best Hook Logic
    useEffect(() => {
        if (suggestedHooks.length > 0) {
            const bestHook = [...suggestedHooks].sort((a,b) => b.score - a.score)[0];
            const currentText = textObjects.find(t => t.id === selectedTextId)?.text || "";
            const isPlaceholder = currentText.includes("عنوان جذاب") || currentText.includes("نص") || currentText.trim() === "";
            
            if (bestHook && isPlaceholder && selectedTextId) {
                if(parentOnUpdateText) parentOnUpdateText('text', bestHook.hook);
                else {
                     setTextObjects(prev => prev.map(t => t.id === selectedTextId ? { ...t, text: bestHook.hook } : t));
                }
            }
        }
    }, [suggestedHooks, selectedTextId]);

    const toggleFullScreen = () => setIsFullScreen(!isFullScreen);
    
    // History Logic
    const pushHistory = () => {
        setHistory(prev => [...prev, JSON.parse(JSON.stringify(textObjects))].slice(-20));
        setFuture([]);
    };
    const handleUndo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setFuture(prev => [textObjects, ...prev]);
        setTextObjects(previous);
        setHistory(prev => prev.slice(0, -1));
    };
    const handleRedo = () => {
        if (future.length === 0) return;
        const next = future[0];
        setHistory(prev => [...prev, textObjects]);
        setTextObjects(next);
        setFuture(prev => prev.slice(1));
    };

    // --- Manipulation Handlers ---
    const updateObject = (id: string, key: keyof TextObject, value: any, recordHistory: boolean = true) => {
        if (recordHistory) pushHistory();
        setTextObjects(prev => prev.map(t => t.id === id ? { ...t, [key]: value } : t));
    };

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                handleUndo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedo();
                return;
            }

            // Esc to deselect
            if (e.key === 'Escape') {
                if (isFullScreen) setIsFullScreen(false);
                onSelectText('');
                return;
            }

            if (selectedTextId) {
                const activeObj = textObjects.find(t => t.id === selectedTextId);
                if (!activeObj) return;

                // Nudge with Arrows
                const moveAmount = e.shiftKey ? 10 : 1;
                if (e.key === 'ArrowUp') { e.preventDefault(); updateObject(selectedTextId, 'y', activeObj.y - moveAmount, false); }
                if (e.key === 'ArrowDown') { e.preventDefault(); updateObject(selectedTextId, 'y', activeObj.y + moveAmount, false); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); updateObject(selectedTextId, 'x', activeObj.x - moveAmount, false); }
                if (e.key === 'ArrowRight') { e.preventDefault(); updateObject(selectedTextId, 'x', activeObj.x + moveAmount, false); }
                
                // Delete
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    pushHistory();
                    setTextObjects(prev => prev.filter(t => t.id !== selectedTextId));
                    onSelectText('');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedTextId, textObjects, isFullScreen, history, future]);

    const handleUpdateTextProps = (key: keyof TextObject, value: any) => {
        if (!selectedTextId) return;
        if (parentOnUpdateText) parentOnUpdateText(key, value);
        else updateObject(selectedTextId, key, value);
    };
    const handleApplyTemplate = (tpl: CanvasTemplate) => {
        if(window.confirm('هل تريد استبدال التصميم الحالي بالقالب؟')) {
            pushHistory();
            const newObjs = tpl.objects.map((obj, i) => ({
                ...obj, id: `t_${Date.now()}_${i}`, fontFamily: 'Cairo', shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.8)', isLocked: false, isHidden: false, align: 'center' as const,
                text: obj.text || 'نص', x: obj.x || 640, y: obj.y || 360, fontSize: obj.fontSize || 60, color: obj.color || '#fff', strokeColor: obj.strokeColor || '#000', strokeWidth: obj.strokeWidth || 2,
                highlightWords: obj.highlightWords || [], highlightColor: obj.highlightColor || '#fbbf24', highlightScale: obj.highlightScale || 1.1, lineHeight: 1.2, opacity: 1, rotation: obj.rotation || 0
            } as TextObject));
            setTextObjects(newObjs);
            if(newObjs.length > 0) onSelectText(newObjs[0].id);
        }
    };
    const handleAddTextLayer = (text: string) => {
        if (parentOnAddTextLayer) { parentOnAddTextLayer(text); return; }
        pushHistory();
        const newObj: TextObject = {
            id: `t${Date.now()}`, text: text, x: 640, y: 360, fontSize: 100, fontFamily: 'Cairo', color: '#ffffff', strokeColor: '#000000', strokeWidth: 4, shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 10, highlightWords: [], highlightColor: '#fbbf24', highlightScale: 1.0, lineHeight: 1.2, isDragging: false, opacity: 1, rotation: 0, align: 'center', isLocked: false, isHidden: false, zIndex: textObjects.length + 1
        };
        setTextObjects(prev => [...prev, newObj]);
        onSelectText(newObj.id);
    };

    // --- Generation Handlers ---
    const handleGenClick = () => {
        onGenerateImage({
            prompt: positivePrompt,
            neg: negativePrompt,
            style: imgStyle
        });
    };

    const handleMagicEnhance = async () => {
        if (!onEnhancePrompt) return;
        setEnhancingPrompt(true);
        try {
            const enhanced = await onEnhancePrompt();
            setPositivePrompt(enhanced);
            setImgStyle(STYLES[1].val); // Switch to cinematic
        } catch (e) {
            console.error(e);
        }
        setEnhancingPrompt(false);
    };

    // --- Canvas Interaction ---
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
            if (obj.isHidden || obj.isLocked) continue; 
            const dist = Math.sqrt(Math.pow(mouseX - obj.x, 2) + Math.pow(mouseY - obj.y, 2));
            if (dist < 150) { 
                pushHistory(); onSelectText(obj.id); setTextObjects(prev => prev.map(t => t.id === obj.id ? { ...t, isDragging: true } : t)); setDragOffset({ x: mouseX - obj.x, y: mouseY - obj.y }); return;
            }
        }
        onSelectText('');
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const activeObj = textObjects.find(t => t.id === selectedTextId);
        if (!activeObj || !activeObj.isDragging || activeObj.isLocked) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        let mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        let mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        // Snap Logic
        let newX = mouseX - dragOffset.x;
        let newY = mouseY - dragOffset.y;
        const centerX = 1280 / 2;
        const centerY = 720 / 2;
        const SNAP_THRESHOLD = 15;
        let snappedX = undefined;
        let snappedY = undefined;

        if (Math.abs(newX - centerX) < SNAP_THRESHOLD) {
            newX = centerX;
            snappedX = centerX;
        }
        if (Math.abs(newY - centerY) < SNAP_THRESHOLD) {
            newY = centerY;
            snappedY = centerY;
        }
        setSnapLines({ x: snappedX, y: snappedY });

        setTextObjects(prev => prev.map(t => t.id === selectedTextId ? { ...t, x: newX, y: newY } : t));
    };

    const handleMouseUp = () => {
        setTextObjects(prev => prev.map(t => ({ ...t, isDragging: false })));
        setSnapLines({});
    };

    // --- Drawing Effect ---
    useEffect(() => {
        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
      
            // Draw Background
            if (generatedImage) {
                const img = new Image();
                img.src = generatedImage;
                const drawImg = () => {
                        const ratio = Math.max(canvas.width / img.width, canvas.height / img.height);
                        const cx = (canvas.width - img.width * ratio) / 2;
                        const cy = (canvas.height - img.height * ratio) / 2;
                        ctx.drawImage(img, 0, 0, img.width, img.height, cx, cy, img.width * ratio, img.height * ratio);
                };
                if (img.complete) drawImg(); else img.onload = drawImg;
            } else {
                const grd = ctx.createLinearGradient(0, 0, 1280, 720);
                grd.addColorStop(0, "#1e1b4b"); grd.addColorStop(1, "#4338ca");
                ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
      
            // Draw Objects
            textObjects.forEach(obj => {
                if (obj.isHidden) return;
                ctx.save();
                ctx.globalAlpha = obj.opacity ?? 1;
                
                // Pre-calc dimensions for background/selection
                const lines = obj.text.split('\n');
                const baseLineHeight = obj.fontSize * (obj.lineHeight ?? 1.2);
                const totalHeight = lines.length * baseLineHeight;
                let maxLineWidth = 0;
                ctx.font = `900 ${obj.fontSize}px '${obj.fontFamily}'`;
                lines.forEach(line => {
                    const width = ctx.measureText(line).width;
                    if (width > maxLineWidth) maxLineWidth = width;
                });

                ctx.translate(obj.x, obj.y);
                ctx.rotate((obj.rotation || 0) * Math.PI / 180);
                ctx.translate(-obj.x, -obj.y);
                
                // Draw Background visual cue when dragging
                if (obj.isDragging) {
                    ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
                    ctx.fillRect(obj.x - maxLineWidth/2 - 20, obj.y - totalHeight/2 - 20, maxLineWidth + 40, totalHeight + 40);
                }

                const startY = obj.y - (totalHeight / 2) + (baseLineHeight / 2);
                lines.forEach((line, i) => {
                    const lineY = startY + (i * baseLineHeight);
                    let words = line.split(' ');
                    const isArabic = /[\u0600-\u06FF]/.test(line);
                    if (isArabic) { words = words.reverse(); ctx.direction = 'rtl'; } else { ctx.direction = 'ltr'; }
                    const wordMetrics = words.map(w => {
                        const cleanW = w.trim().replace(/[.,!؟]/g, '');
                        const isHigh = obj.highlightWords.includes(cleanW);
                        const currentSize = isHigh ? obj.fontSize * obj.highlightScale : obj.fontSize;
                        ctx.font = `900 ${currentSize}px '${obj.fontFamily}'`;
                        return { word: w, width: ctx.measureText(w + ' ').width, size: currentSize, isHigh };
                    });
                    const totalLineWidth = wordMetrics.reduce((acc, m) => acc + m.width, 0);
                    let drawX = obj.x;
                    if (obj.align === 'center' || !obj.align) drawX = obj.x - (totalLineWidth / 2);
                    else if (obj.align === 'right') drawX = obj.x - totalLineWidth;
                    ctx.textAlign = 'left'; 
                    wordMetrics.forEach(m => {
                        ctx.font = `900 ${m.size}px '${obj.fontFamily}'`;
                        ctx.shadowColor = obj.shadowColor; ctx.shadowBlur = obj.shadowBlur;
                        ctx.lineWidth = obj.strokeWidth; ctx.strokeStyle = obj.strokeColor; ctx.fillStyle = m.isHigh ? obj.highlightColor : obj.color;
                        ctx.strokeText(m.word, drawX, lineY); ctx.fillText(m.word, drawX, lineY);
                        drawX += m.width;
                    });
                    ctx.shadowBlur = 0; 
                });

                // Selection UI (Handles)
                if (obj.id === selectedTextId) {
                   const padding = 20;
                   const rectX = obj.x - (maxLineWidth / 2) - padding;
                   const rectY = obj.y - (totalHeight / 2) - padding;
                   const rectW = maxLineWidth + (padding * 2);
                   const rectH = totalHeight + (padding * 2);

                   ctx.strokeStyle = obj.isLocked ? '#f59e0b' : '#6366f1'; 
                   ctx.lineWidth = 2; 
                   ctx.setLineDash([]);
                   ctx.strokeRect(rectX, rectY, rectW, rectH);
                   
                   // Draw Handles
                   const handleSize = 6;
                   ctx.fillStyle = '#fff';
                   ctx.beginPath(); 
                   ctx.arc(rectX, rectY, handleSize, 0, 2*Math.PI);
                   ctx.arc(rectX + rectW, rectY, handleSize, 0, 2*Math.PI);
                   ctx.arc(rectX, rectY + rectH, handleSize, 0, 2*Math.PI);
                   ctx.arc(rectX + rectW, rectY + rectH, handleSize, 0, 2*Math.PI);
                   ctx.fill();
                   ctx.stroke();

                   if (obj.isLocked) { ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(obj.x, obj.y - (totalHeight/2) - 40, 10, 0, 2*Math.PI); ctx.fill(); }
                }
                ctx.restore();
            });

            // Drawing of Snap Lines has been removed to prevent the visual marker.
            // The snapping logic in handleMouseMove remains active for the magnetic effect.
        };
        document.fonts.ready.then(draw);
    }, [textObjects, selectedTextId, generatedImage, snapLines]);

    const selectedObj = textObjects.find(t => t.id === selectedTextId);
    const containerClass = isFullScreen ? "fixed inset-0 z-50 bg-gray-950 p-2 flex flex-col h-screen overflow-hidden animate-fade-in" : "space-y-4";
    const canvasWrapperClass = isFullScreen ? "flex-1 relative flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden border border-gray-700 min-h-0" : "flex-1 relative bg-gray-800 rounded-lg overflow-hidden shadow-2xl border border-gray-700 flex items-center justify-center";

    return (
        <div className={containerClass}>
            <div className={`bg-gray-900 p-4 rounded-xl shadow-lg border border-gray-700 ${isFullScreen ? 'flex-1 flex flex-col min-h-0' : ''}`}>
                
                {/* Top Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 text-white gap-4 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <h3 className="font-bold flex items-center gap-2"><ImageIcon className="text-indigo-400" size={20}/> محرر الصور</h3>
                            <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-600">
                                <button onClick={handleUndo} disabled={history.length===0} className="p-1.5 hover:text-white text-gray-400 disabled:opacity-30" title="تراجع (Ctrl+Z)"><Undo size={16}/></button>
                                <button onClick={handleRedo} disabled={future.length===0} className="p-1.5 hover:text-white text-gray-400 disabled:opacity-30" title="إعادة (Ctrl+Y)"><Redo size={16}/></button>
                            </div>
                            <button onClick={toggleFullScreen} className="p-2 rounded hover:bg-gray-700 text-indigo-400 hover:text-indigo-300 transition" title="ملء الشاشة">
                                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button onClick={() => setShowAdvancedGen(!showAdvancedGen)} className={`text-xs px-3 py-1.5 rounded flex items-center gap-1 transition border ${showAdvancedGen ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                                <Sliders size={14}/> إعدادات التوليد
                            </button>
                             <button onClick={handleGenClick} disabled={genLoading} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-500 flex items-center gap-1 transition shadow-lg shadow-indigo-900/50 font-bold">
                                {genLoading ? <RefreshCw className="animate-spin" size={14}/> : <Sparkles size={14}/>} توليد AI
                            </button>
                            <button onClick={onDownloadImage} className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded hover:bg-gray-600 flex items-center gap-1 transition">
                                <Download size={14}/> حفظ PNG
                            </button>
                            <button onClick={onUploadImageOnly} disabled={isUploading} className="text-xs bg-green-700 text-white px-3 py-1.5 rounded hover:bg-green-600 flex items-center gap-1 transition shadow-lg shadow-green-900/50 border border-green-600">
                                {isUploading ? <RefreshCw className="animate-spin" size={14}/> : <CloudUpload size={14}/>} رفع
                            </button>
                        </div>
                </div>

                {/* --- Advanced Generation Settings (Collapsible) --- */}
                {showAdvancedGen && (
                    <div className="bg-gray-800 p-4 rounded-xl border border-indigo-500/30 mb-4 animate-fade-in-down">
                        <div className="flex justify-between items-center mb-3">
                             <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2"><Wand2 size={14}/> إعدادات البرومبت المتقدمة</h4>
                             <button onClick={handleMagicEnhance} disabled={enhancingPrompt} className="text-[10px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-full hover:shadow-lg transition flex items-center gap-1">
                                {enhancingPrompt ? <RefreshCw className="animate-spin" size={10}/> : <Sparkles size={10}/>} تحسين البرومبت تلقائياً (Magic)
                             </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] text-gray-400 mb-1 font-bold">وصف الصورة (Positive Prompt)</label>
                                <textarea value={positivePrompt} onChange={e => setPositivePrompt(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white h-20 focus:border-indigo-500 outline-none" placeholder="وصف المشهد بالإنجليزية..."></textarea>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1 font-bold">عناصر ممنوعة (Negative Prompt)</label>
                                    <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-red-200 h-10 focus:border-red-500 outline-none"></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1 font-bold">الستايل (Style)</label>
                                        <select value={imgStyle} onChange={e => setImgStyle(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-1.5 text-xs text-white outline-none">
                                            {STYLES.map(s => <option key={s.label} value={s.val}>{s.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1 font-bold">لغة العناوين (Hooks)</label>
                                        <select value={hookLanguage} onChange={e => setHookLanguage(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-1.5 text-xs text-white outline-none">
                                            <option value="Arabic">العربية</option>
                                            <option value="English">English</option>
                                            <option value="German">Deutsch</option>
                                            <option value="French">Français</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Middle Section (Layers + Canvas) */}
                <div className={`flex flex-col lg:flex-row gap-4 ${isFullScreen ? 'flex-1 min-h-0 overflow-hidden' : 'h-[200px]'}`}>
                    {/* Sidebar */}
                    <div className="w-full lg:w-64 flex flex-col gap-4 flex-shrink-0 h-full">
                        <div className="flex border-b border-gray-700 pb-2 gap-4 flex-shrink-0">
                            <button onClick={() => setShowTemplates(false)} className={`text-xs font-bold pb-1 flex items-center gap-2 ${!showTemplates ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500'}`}><Undo size={14}/> الطبقات</button>
                            <button onClick={() => setShowTemplates(true)} className={`text-xs font-bold pb-1 flex items-center gap-2 ${showTemplates ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500'}`}><Layout size={14}/> القوالب</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {showTemplates ? (
                                 <div className="space-y-2">
                                    {TEMPLATES.map(t => (
                                        <button key={t.id} onClick={() => handleApplyTemplate(t)} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-indigo-500 transition text-right group">
                                            <div className="h-2 w-full rounded mb-2" style={{backgroundColor: t.previewColor}}></div>
                                            <span className="text-xs font-bold text-gray-300 group-hover:text-white">{t.name}</span>
                                        </button>
                                    ))}
                                 </div>
                            ) : (
                                <LayerPanel layers={textObjects} selectedId={selectedTextId} onSelect={onSelectText} onToggleHidden={(id) => { pushHistory(); setTextObjects(prev => prev.map(t => t.id === id ? { ...t, isHidden: !t.isHidden } : t)); }} onToggleLock={(id) => { pushHistory(); setTextObjects(prev => prev.map(t => t.id === id ? { ...t, isLocked: !t.isLocked } : t)); }} onDelete={(id) => { pushHistory(); setTextObjects(prev => prev.filter(t => t.id !== id)); onSelectText(''); }} onMoveLayer={(id, dir) => { const idx = textObjects.findIndex(t => t.id === id); if(idx === -1) return; pushHistory(); const newArr = [...textObjects]; if (dir === 'up' && idx < newArr.length - 1) { [newArr[idx], newArr[idx+1]] = [newArr[idx+1], newArr[idx]]; } else if (dir === 'down' && idx > 0) { [newArr[idx], newArr[idx-1]] = [newArr[idx-1], newArr[idx]]; } setTextObjects(newArr); }} />
                            )}
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className={canvasWrapperClass}>
                        <canvas ref={canvasRef} width={1280} height={720} className="max-w-full max-h-full object-contain cursor-crosshair shadow-2xl" onMouseDown={props.onMouseDown || handleMouseDown} onMouseMove={props.onMouseMove || handleMouseMove} onMouseUp={props.onMouseUp || handleMouseUp} onMouseLeave={props.onMouseLeave || handleMouseUp} />
                        <div className="absolute bottom-2 right-2 text-white/30 text-[10px] pointer-events-none select-none flex items-center gap-1"><Move size={10}/> اسحب للنقل • انقر للتعديل</div>
                    </div>
                </div>

                {/* --- Text Editor Controls --- */}
                {selectedObj && !selectedObj.isLocked && (
                    <div className="mt-4 bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4 animate-fade-in border-t-4 border-t-indigo-600 flex-shrink-0">
                        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                            <span className="text-white font-bold text-sm flex items-center gap-2"><Type size={16}/> خصائص: {selectedObj.text.substring(0, 10)}...</span>
                            <button onClick={() => onSelectText('')} className="text-gray-400 hover:text-white"><X size={16}/></button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4">
                            {/* NEW: Hooks Suggestions Container (Inside Editor) */}
                            {suggestedHooks.length > 0 && (
                                <div className="col-span-2 md:col-span-4 bg-gray-900/50 p-2 rounded border border-gray-700 mb-2">
                                     <h4 className="text-[10px] text-gray-400 font-bold uppercase mb-2 flex items-center gap-1"><Sparkles size={10} className="text-yellow-500"/> اقتراحات (اضغط للاستخدام)</h4>
                                     <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                                        {suggestedHooks.sort((a,b)=>b.score-a.score).slice(0, 10).map((h, i) => (
                                            <button key={i} onClick={() => handleUpdateTextProps('text', h.hook)} className="text-[10px] bg-gray-800 border border-gray-600 hover:border-indigo-500 hover:bg-indigo-900/20 text-gray-300 px-2 py-1 rounded transition flex items-center gap-1">
                                                {h.hook} <span className="text-green-500 font-bold">({h.score})</span>
                                            </button>
                                        ))}
                                     </div>
                                </div>
                            )}

                            {/* Full Width Text Area with Generation Trigger */}
                            <div className="col-span-2 md:col-span-4 relative">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase">النص المكتوب</label>
                                    <button 
                                        onClick={onGenerateHooks} 
                                        disabled={hooksLoading}
                                        className="text-[10px] text-indigo-400 hover:text-white flex items-center gap-1 bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-500/30 hover:bg-indigo-600 transition"
                                        title="توليد عناوين جديدة (Hooks)"
                                    >
                                        {hooksLoading ? <RefreshCw className="animate-spin" size={10}/> : <Sparkles size={10}/>} توليد عناوين
                                    </button>
                                </div>
                                <textarea value={selectedObj.text} onChange={e => handleUpdateTextProps('text', e.target.value)} className="w-full bg-gray-800 text-white p-3 rounded-lg text-lg text-center font-bold border border-gray-600 focus:border-indigo-500 outline-none" rows={2} dir="auto" />
                            </div>
                            
                            {/* Font Family & Alignment */}
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold tracking-wider">نوع الخط</label>
                                <select value={selectedObj.fontFamily} onChange={e => handleUpdateTextProps('fontFamily', e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded text-sm border border-gray-600 outline-none focus:border-indigo-500">
                                    {FONTS.map(f => <option key={f.name} value={f.val}>{f.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold tracking-wider">المحاذاة</label>
                                <div className="flex bg-gray-700 rounded border border-gray-600 overflow-hidden">
                                    <button onClick={() => handleUpdateTextProps('align', 'right')} className={`flex-1 p-1.5 hover:bg-gray-600 transition ${selectedObj.align === 'right' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}><AlignRight size={16} className="mx-auto"/></button>
                                    <button onClick={() => handleUpdateTextProps('align', 'center')} className={`flex-1 p-1.5 hover:bg-gray-600 transition ${(!selectedObj.align || selectedObj.align === 'center') ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}><AlignCenter size={16} className="mx-auto"/></button>
                                    <button onClick={() => handleUpdateTextProps('align', 'left')} className={`flex-1 p-1.5 hover:bg-gray-600 transition ${selectedObj.align === 'left' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}><AlignLeft size={16} className="mx-auto"/></button>
                                </div>
                            </div>
                            
                            {/* Alignment Shortcuts (New) */}
                            <div className="col-span-2 md:col-span-1 mt-2">
                                <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold tracking-wider">توسيط سريع</label>
                                <div className="flex gap-2">
                                    <button onClick={() => updateObject(selectedTextId, 'x', 640)} className="flex-1 bg-gray-700 text-xs text-white p-1 rounded hover:bg-indigo-600 transition border border-gray-600 flex items-center justify-center gap-1" title="توسيط أفقي">
                                        <Grid size={12}/> أفقي
                                    </button>
                                    <button onClick={() => updateObject(selectedTextId, 'y', 360)} className="flex-1 bg-gray-700 text-xs text-white p-1 rounded hover:bg-indigo-600 transition border border-gray-600 flex items-center justify-center gap-1" title="توسيط رأسي">
                                        <Crosshair size={12}/> رأسي
                                    </button>
                                </div>
                            </div>

                            {/* Colors */}
                            <div className="col-span-2 md:col-span-4 flex gap-2 border-t border-gray-700 pt-3 mt-1">
                                <div className="flex-1"><label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold tracking-wider">اللون</label><input type="color" value={selectedObj.color} onChange={e => handleUpdateTextProps('color', e.target.value)} className="w-full h-9 rounded cursor-pointer bg-transparent border border-gray-600 p-0.5" /></div>
                                <div className="flex-1"><label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold tracking-wider">الحدود</label><input type="color" value={selectedObj.strokeColor} onChange={e => handleUpdateTextProps('strokeColor', e.target.value)} className="w-full h-9 rounded cursor-pointer bg-transparent border border-gray-600 p-0.5" /></div>
                                <div className="flex-1"><label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold tracking-wider">الظل</label><input type="color" value={selectedObj.shadowColor} onChange={e => handleUpdateTextProps('shadowColor', e.target.value)} className="w-full h-9 rounded cursor-pointer bg-transparent border border-gray-600 p-0.5" /></div>
                            </div>

                            {/* Sliders */}
                            <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-750 p-3 rounded border border-gray-600/50">
                                <div className="col-span-1"><label className="text-[10px] text-gray-400 uppercase font-bold">حجم الخط: {Math.round(selectedObj.fontSize)}</label><input type="range" min="20" max="250" step="2" value={selectedObj.fontSize} onChange={e => handleUpdateTextProps('fontSize', Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" /></div>
                                <div className="col-span-1"><label className="text-[10px] text-gray-400 uppercase font-bold">التدوير: {selectedObj.rotation || 0}°</label><input type="range" min="-180" max="180" step="5" value={selectedObj.rotation || 0} onChange={e => handleUpdateTextProps('rotation', Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" /></div>
                                <div className="col-span-2 md:col-span-1"><label className="text-[10px] text-gray-400 uppercase font-bold">تباعد السطور: {selectedObj.lineHeight || 1.2}</label><input type="range" min="0.5" max="3.0" step="0.1" value={selectedObj.lineHeight || 1.2} onChange={e => handleUpdateTextProps('lineHeight', Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" /></div>
                            </div>

                            {/* Highlight Section */}
                            <div className="col-span-2 md:col-span-4 bg-indigo-900/20 p-3 rounded border border-indigo-500/30">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2"><Palette className="text-indigo-400" size={14}/><span className="text-indigo-200 text-xs font-bold">تمييز الكلمات (Highlight)</span></div>
                                    <div className="flex items-center gap-2"><input type="color" value={selectedObj.highlightColor} onChange={e => handleUpdateTextProps('highlightColor', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"/><input type="range" min="1.0" max="2.0" step="0.1" value={selectedObj.highlightScale || 1.0} onChange={e => handleUpdateTextProps('highlightScale', Number(e.target.value))} className="w-20 accent-indigo-400 h-1 bg-indigo-900 rounded-lg appearance-none cursor-pointer"/></div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedObj.text.split(/[\s\n]+/).filter(w => w.length > 0).map((word, idx) => {
                                        const cleanW = word.trim().replace(/[.,!؟]/g, '');
                                        const isHigh = selectedObj.highlightWords.includes(cleanW);
                                        return (
                                            <button key={idx} onClick={() => { if (parentOnToggleHighlight) parentOnToggleHighlight(word); else { const nh = isHigh ? selectedObj.highlightWords.filter(x => x!==cleanW) : [...selectedObj.highlightWords, cleanW]; handleUpdateTextProps('highlightWords', nh); } }} className={`text-xs px-2 py-1 rounded border transition ${isHigh ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg scale-105' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'}`}>
                                                {word}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CanvasWorkspace;