import React from 'react';
import { TextObject } from '../../types';
import { Eye, EyeOff, Lock, Unlock, Trash2, ChevronUp, ChevronDown, Type, Image as ImageIcon, Layers } from 'lucide-react';

interface LayerPanelProps {
  layers: TextObject[];
  selectedId: string;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedId,
  onSelect,
  onToggleHidden,
  onToggleLock,
  onDelete,
  onMoveLayer
}) => {
  
  // We reverse the array for display so the top layer (highest Z-index) appears at the top of the list
  const displayLayers = [...layers].reverse();

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-full max-h-[500px]">
      
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
        <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2">
            <Layers size={14} className="text-indigo-400"/> طبقات التصميم ({layers.length})
        </h4>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {displayLayers.length === 0 ? (
             <div className="text-center py-8 text-gray-500 text-xs">
                 لا توجد طبقات. أضف نصاً للبدء.
             </div>
        ) : (
            displayLayers.map((layer) => {
                const isSelected = layer.id === selectedId;
                
                return (
                    <div 
                        key={layer.id}
                        onClick={() => onSelect(layer.id)}
                        className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                            isSelected 
                            ? 'bg-indigo-900/40 border-indigo-500/50' 
                            : 'bg-gray-700/30 border-transparent hover:bg-gray-700'
                        }`}
                    >
                        {/* Type Icon */}
                        <div className={`p-1.5 rounded ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-400'}`}>
                            <Type size={12} />
                        </div>

                        {/* Layer Name/Text */}
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs truncate font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`} dir="auto">
                                {layer.text || "طبقة نصية"}
                            </p>
                        </div>

                        {/* Controls (Show on Hover or Selected) */}
                        <div className={`flex items-center gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            
                            {/* Move Up/Down (Reverse logic because list is reversed) */}
                            <div className="flex flex-col gap-0.5">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'up'); }}
                                    className="text-gray-400 hover:text-white p-0.5"
                                    title="تحريك للأمام"
                                >
                                    <ChevronUp size={10} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'down'); }}
                                    className="text-gray-400 hover:text-white p-0.5"
                                    title="تحريك للخلف"
                                >
                                    <ChevronDown size={10} />
                                </button>
                            </div>

                            {/* Visibility */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onToggleHidden(layer.id); }}
                                className={`p-1.5 rounded hover:bg-gray-600 ${layer.isHidden ? 'text-gray-500' : 'text-gray-300'}`}
                                title={layer.isHidden ? "إظهار" : "إخفاء"}
                            >
                                {layer.isHidden ? <EyeOff size={12}/> : <Eye size={12}/>}
                            </button>

                            {/* Lock */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                                className={`p-1.5 rounded hover:bg-gray-600 ${layer.isLocked ? 'text-amber-500' : 'text-gray-300'}`}
                                title={layer.isLocked ? "فك القفل" : "قفل"}
                            >
                                {layer.isLocked ? <Lock size={12}/> : <Unlock size={12}/>}
                            </button>

                            {/* Delete */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); if(window.confirm('حذف الطبقة؟')) onDelete(layer.id); }}
                                className="p-1.5 rounded hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition"
                                title="حذف"
                            >
                                <Trash2 size={12}/>
                            </button>
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 bg-gray-900/50 border-t border-gray-700 text-[10px] text-gray-500 text-center">
          اسحب العناصر في اللوحة لترتيبها (قريباً)
      </div>
    </div>
  );
};

export default LayerPanel;