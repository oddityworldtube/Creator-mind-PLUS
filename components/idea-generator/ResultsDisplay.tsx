import React, { useState, useEffect } from 'react';
import { CopyIcon, CheckIcon, LoadingIcon, ClipboardDocumentListIcon, RefreshIcon } from './Icons';
import { Idea } from '../../types';

interface ResultsDisplayProps {
  id?: string;
  ideas: Idea[];
  isLoading: boolean;
  error: string | null;
  selectedIdeas: Idea[];
  onSelectIdea: (idea: Idea) => void;
  onRegenerateFromTitle: (title: string) => void;
}

const getRatingColor = (rating: number): string => {
    if (rating >= 90) return 'bg-green-100 text-green-700 ring-1 ring-inset ring-green-500/30';
    if (rating >= 80) return 'bg-yellow-100 text-yellow-700 ring-1 ring-inset ring-yellow-500/30';
    return 'bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-500/30';
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ id, ideas, isLoading, error, selectedIdeas, onSelectIdea, onRegenerateFromTitle }) => {
  const [isAllCopied, setIsAllCopied] = useState(false);
  const [isTitlesCopied, setIsTitlesCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const handleCopyAll = () => {
    const textToCopy = ideas.map(idea => idea.originalLine).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setIsAllCopied(true);
    setTimeout(() => setIsAllCopied(false), 2000);
  };

  const handleCopyTitles = () => {
    const titlesOnly = ideas.map(idea => idea.title).join('\n');
    navigator.clipboard.writeText(titlesOnly);
    setIsTitlesCopied(true);
    setTimeout(() => setIsTitlesCopied(false), 2000);
  }
  
  const handleCopyLine = (idea: Idea, index: number) => {
    navigator.clipboard.writeText(idea.originalLine);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    setIsAllCopied(false);
    setIsTitlesCopied(false);
    setCopiedIndex(null);
  }, [ideas]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-gray-400 p-12 bg-white border border-gray-200 rounded-2xl shadow-sm h-64">
          <LoadingIcon className="animate-spin h-10 w-10 mb-4 text-indigo-500" />
          <p className="text-sm font-medium text-gray-500">جاري تحليل البيانات وتوليد العناوين الفيرال...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-600 bg-red-50 border border-red-100 p-6 rounded-2xl">
          <p className="font-bold">{error}</p>
        </div>
      );
    }
    
    if (ideas.length === 0) {
        return (
            <div className="text-center text-gray-400 p-12 bg-white border border-dashed border-gray-200 rounded-2xl h-64 flex flex-col justify-center items-center">
                <div className="bg-gray-50 p-4 rounded-full mb-3">
                    <ClipboardDocumentListIcon className="h-8 w-8 opacity-20"/>
                </div>
                <p>ستظهر الأفكار المقترحة هنا.</p>
            </div>
        )
    }

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 relative shadow-sm">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
             <div>
                <h3 className="text-lg font-bold text-gray-800">النتائج ({ideas.length})</h3>
                <p className="text-xs text-gray-400 mt-1">مرتبة حسب قوة الـ SEO واحتمالية الانتشار</p>
             </div>
             <div className="flex gap-2">
                <button onClick={handleCopyAll} className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold" title="نسخ الكل (عناوين وأوصاف)">
                  {isAllCopied ? <CheckIcon className="h-3 w-3 text-green-600" /> : <CopyIcon className="h-3 w-3" />}
                  نسخ الكل
                </button>
                <button onClick={handleCopyTitles} className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold" title="نسخ العناوين فقط">
                  {isTitlesCopied ? <CheckIcon className="h-3 w-3 text-green-600" /> : <ClipboardDocumentListIcon className="h-3 w-3" />}
                  نسخ العناوين
                </button>
            </div>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {ideas.map((idea, index) => {
            const isSelected = selectedIdeas.some(i => i.id === idea.id);
            return (
              <div key={idea.id} className={`flex items-start group p-3 rounded-xl transition-all border ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'}`}>
                <div className="flex-shrink-0 pt-1 pl-3">
                    <input type="checkbox" checked={isSelected} onChange={() => onSelectIdea(idea)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${getRatingColor(idea.score)}`}>{idea.score}</span>
                    <p className="font-bold text-gray-800 text-sm">{idea.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed ml-10">{idea.description}</p>
                </div>
                <div className="flex items-center mr-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    <button onClick={() => onRegenerateFromTitle(idea.title)} className="bg-white border border-gray-200 hover:border-indigo-300 text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg shadow-sm" title="توليد أفكار مشابهة">
                        <RefreshIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleCopyLine(idea, index)} className="bg-white border border-gray-200 hover:border-indigo-300 text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg shadow-sm" title="نسخ">
                      {copiedIndex === index ? <CheckIcon className="h-4 w-4 text-green-600" /> : <CopyIcon className="h-4 w-4" />}
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return <div id={id} className="mt-8 w-full">{renderContent()}</div>;
};