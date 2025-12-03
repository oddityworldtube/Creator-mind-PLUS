
import React, { useState, useMemo } from 'react';
import { ChevronDownIcon, RefreshIcon, TrashIcon, LoadingIcon } from './Icons';
import { Niche } from '../../data/niches';

interface SuggestedNichesProps {
  onNicheSelect: (niche: string) => void;
  allNiches: Niche[];
  onDeleteNiche: (nicheId: string) => void;
  onRefreshCategory: (category: string) => Promise<void>;
}

const getRatingColor = (rating: number): string => {
    if (rating >= 90) return 'bg-green-100 text-green-700 ring-1 ring-inset ring-green-500/30';
    if (rating >= 80) return 'bg-yellow-100 text-yellow-700 ring-1 ring-inset ring-yellow-500/30';
    return 'bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-500/30';
};

export const SuggestedNiches: React.FC<SuggestedNichesProps> = ({ onNicheSelect, allNiches, onDeleteNiche, onRefreshCategory }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshingCategory, setRefreshingCategory] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const handleToggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const handleRefresh = async (e: React.MouseEvent, category: string) => {
        e.stopPropagation(); // Prevent toggling the group
        setRefreshingCategory(category);
        await onRefreshCategory(category);
        setRefreshingCategory(null);
        if(!expandedGroups[category]) handleToggleGroup(category); // Open if closed
    };

    const filteredNiches = useMemo(() => {
        return allNiches.filter(niche =>
            niche.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, allNiches]);

    const nicheGroups = useMemo(() => {
        const groups: Record<string, { title: string, niches: Niche[], color: string }> = {
            'psychology': { title: 'علم النفس وتحليل الشخصيات', niches: [], color: 'border-purple-200' },
            'documentary': { title: 'وثائقي، تاريخي واكتشافات', niches: [], color: 'border-sky-200' },
            'tech': { title: 'تكنولوجيا وتقنية', niches: [], color: 'border-blue-200' },
            'lifestyle': { title: 'أسلوب حياة', niches: [], color: 'border-pink-200' },
            'finance': { title: 'تمويل واستثمار', niches: [], color: 'border-green-200' },
            'business': { title: 'أعمال وتسويق', niches: [], color: 'border-indigo-200' },
            'entertainment': { title: 'ترفيه', niches: [], color: 'border-red-200' },
            'education': { title: 'تعليم', niches: [], color: 'border-amber-200' },
            'sports': { title: 'رياضة', niches: [], color: 'border-orange-200' },
            'general': { title: 'متنوع', niches: [], color: 'border-gray-200' },
        };

        filteredNiches.forEach(niche => {
            if (groups[niche.category]) {
                groups[niche.category].niches.push(niche);
            } else {
                groups['general'].niches.push(niche);
            }
        });
        
        return Object.entries(groups).map(([id, data]) => ({ id, ...data }));

    }, [filteredNiches]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          نيتشات مقترحة
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{allNiches.length}</span>
      </h2>
      <div className="relative mb-4 flex-shrink-0">
          <input
              type="search" placeholder="ابحث عن نيتش..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition text-gray-700 text-sm font-medium"
          />
      </div>
      <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
        {nicheGroups.map(group => {
            const isExpanded = !!expandedGroups[group.id];
            const isRefreshing = refreshingCategory === group.id;
            
            return (
                <div key={group.id} className={`bg-white rounded-xl border ${group.color} overflow-hidden shadow-sm`}>
                    <div className="flex justify-between items-center p-0">
                        <button onClick={() => handleToggleGroup(group.id)} className="flex-1 p-3 text-right font-bold text-gray-700 flex items-center justify-between hover:bg-gray-50 transition">
                            <div className="flex items-center gap-2">
                                <span>{group.title}</span>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{group.niches.length}</span>
                            </div>
                            <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${!isExpanded ? '-rotate-90' : ''}`} />
                        </button>
                        <button 
                            onClick={(e) => handleRefresh(e, group.id)} 
                            disabled={isRefreshing} 
                            className="p-3 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition border-r border-gray-100 disabled:opacity-50" 
                            title="تحديث: جلب نيتشات تريند جديدة من AI"
                        >
                            {isRefreshing ? <LoadingIcon className="h-4 w-4 animate-spin text-indigo-600"/> : <RefreshIcon className="h-4 w-4"/>}
                        </button>
                    </div>
                    
                    {isExpanded && (
                        <div className="p-3 bg-gray-50/50 border-t border-gray-100">
                            <div className="flex flex-wrap gap-2">
                                {group.niches.sort((a,b) => (b.rating || 0) - (a.rating || 0)).map((niche) => {
                                    const isDynamic = niche.id.startsWith("dyn_");
                                    return (
                                        <div key={niche.id} className="group relative flex items-center">
                                            <button
                                            onClick={() => onNicheSelect(niche.name)}
                                            className="flex items-center bg-white border border-gray-200 text-gray-700 hover:border-indigo-400 hover:text-indigo-700 transition-all duration-200 pl-3 pr-3 py-1.5 rounded-lg shadow-sm text-xs font-bold"
                                            >
                                            <span>{niche.name}</span>
                                            {niche.rating && (
                                                <span className={`mr-2 text-[10px] font-black px-1.5 py-0.5 rounded-full ${getRatingColor(niche.rating)}`}>
                                                {niche.rating}
                                                </span>
                                            )}
                                            </button>
                                            {!isDynamic && (
                                                <button onClick={() => onDeleteNiche(niche.id)} className="absolute -left-1 -top-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 scale-75 hover:scale-100" title="حذف">
                                                    <TrashIcon className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
};
