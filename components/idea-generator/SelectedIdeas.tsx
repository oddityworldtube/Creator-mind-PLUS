import React, { useState } from 'react';
import { Idea } from '../../types';
import { ArrowUpIcon, ArrowDownIcon, CopyIcon, CheckIcon, XCircleIcon, Bars3Icon } from './Icons';

interface SelectedIdeasProps {
  selectedIdeas: Idea[];
  onReorder: (index: number, direction: 'up' | 'down') => void;
  onClearSelection: () => void;
  onDropReorder: (dragIndex: number, hoverIndex: number) => void;
}

export const SelectedIdeas: React.FC<SelectedIdeasProps> = ({ selectedIdeas, onReorder, onClearSelection, onDropReorder }) => {
  const [isCopied, setIsCopied] = useState(false);

  if (selectedIdeas.length === 0) {
    return null;
  }

  const handleCopy = () => {
    const textToCopy = selectedIdeas.map(idea => idea.originalLine).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    e.currentTarget.classList.remove('drag-over-up', 'drag-over-down');
    if (dragIndex !== dropIndex) {
      onDropReorder(dragIndex, dropIndex);
    }
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (dragIndex > index) {
      e.currentTarget.classList.add('drag-over-up');
    } else {
      e.currentTarget.classList.add('drag-over-down');
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-over-up', 'drag-over-down');
  };

  return (
    <div className="mt-8 w-full bg-white border border-gray-200 rounded-2xl shadow-lg shadow-indigo-100 overflow-hidden sticky bottom-4 z-30">
        <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            الأفكار المختارة 
            <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{selectedIdeas.length}</span>
          </h3>
          <div className="flex gap-2">
            <button
                onClick={handleCopy}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-4 rounded-lg transition-colors text-xs shadow-md shadow-indigo-200"
                title="نسخ الأفكار المحددة"
            >
                {isCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                <span>{isCopied ? 'تم النسخ!' : 'نسخ القائمة'}</span>
            </button>
            <button
                onClick={onClearSelection}
                className="bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition-colors border border-gray-200"
                title="مسح التحديد"
            >
                <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {selectedIdeas.map((idea, index) => (
            <div 
              key={idea.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              className="flex items-center group bg-white border border-gray-100 hover:border-indigo-200 p-2 rounded-xl transition-all shadow-sm relative"
            >
              <div className="cursor-move p-1 text-gray-300 hover:text-indigo-400 touch-none" title="اسحب للترتيب">
                  <Bars3Icon className="h-5 w-5" />
              </div>
              <span className="font-bold text-gray-300 text-xs mx-2 w-4">{index + 1}.</span>
              <div className="flex-grow">
                <p className="font-bold text-gray-800 text-sm">{idea.title}</p>
                <p className="text-[10px] text-gray-500 line-clamp-1">{idea.description}</p>
              </div>
              <div className="flex flex-col ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onReorder(index, 'up')} 
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="صعود"
                >
                  <ArrowUpIcon className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => onReorder(index, 'down')}
                  disabled={index === selectedIdeas.length - 1}
                  className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="نزول"
                >
                  <ArrowDownIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
    </div>
  );
};