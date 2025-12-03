import React, { useState, useMemo } from 'react';
import { VideoData, ChannelStats } from '../types';
import { Sparkles, SkipForward, RefreshCw, Filter, Calendar, BarChart2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Skeleton from './ui/Skeleton';

interface VideoListProps {
  videos: VideoData[];
  channelStats: ChannelStats | null;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  loading?: boolean; // New prop for initial loading state
  onAnalyze: (video: VideoData) => void;
  onRefresh: () => void;
}

type FilterType = 'ALL' | 'SHORTS' | 'LONG';
type SortType = 'DATE' | 'VIEWS';

const VideoList: React.FC<VideoListProps> = ({ videos, channelStats, onLoadMore, hasMore, loadingMore, loading, onAnalyze, onRefresh }) => {
  // Filters State
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [sortType, setSortType] = useState<SortType>('DATE');
  const [timeFilter, setTimeFilter] = useState<number>(0); 
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
  };

  const formatNumber = (numStr: string) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(Number(numStr));
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'EXCELLENT': return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold border border-green-200"><CheckCircle2 size={10}/> ممتاز 🔥</span>;
      case 'GOOD': return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-full font-bold border border-blue-200">جيد ✅</span>;
      case 'POOR': return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-full font-bold border border-red-200"><AlertCircle size={10}/> يحتاج تحسين</span>;
      case 'NEW': return <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded-full font-bold border border-purple-200">جديد 🆕</span>;
      default: return <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-full border border-gray-200">عادي</span>;
    }
  };

  const filteredVideos = useMemo(() => {
    let result = [...videos];
    if (filterType === 'SHORTS') result = result.filter(v => v.durationSeconds <= 120);
    else if (filterType === 'LONG') result = result.filter(v => v.durationSeconds > 120);
    if (timeFilter > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - timeFilter);
        result = result.filter(v => new Date(v.publishedAt) >= cutoff);
    }
    if (sortType === 'VIEWS') result.sort((a, b) => Number(b.viewCount) - Number(a.viewCount));
    else result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return result;
  }, [videos, filterType, sortType, timeFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Controls Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: Filters */}
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <div className="flex bg-gray-100/50 rounded-lg p-1 border border-gray-200">
                <button onClick={() => setFilterType('ALL')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${filterType === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>الكل</button>
                <button onClick={() => setFilterType('LONG')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${filterType === 'LONG' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>فيديوهات طويلة</button>
                <button onClick={() => setFilterType('SHORTS')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${filterType === 'SHORTS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Shorts</button>
             </div>
             
             <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>

             <div className="flex items-center gap-2">
                 <div className="relative">
                     <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                     <select value={timeFilter} onChange={(e) => setTimeFilter(Number(e.target.value))} className="bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-indigo-100 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition">
                        <option value={0}>كل الأوقات</option>
                        <option value={30}>آخر 30 يوم</option>
                        <option value={90}>آخر 3 شهور</option>
                     </select>
                 </div>

                 <div className="relative">
                     <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                     <select value={sortType} onChange={(e) => setSortType(e.target.value as SortType)} className="bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-indigo-100 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition">
                        <option value="DATE">الأحدث نشراً</option>
                        <option value="VIEWS">الأكثر مشاهدة</option>
                     </select>
                 </div>
             </div>
          </div>

          {/* Right: Refresh & Count */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
             <div className="text-xs text-gray-400 font-bold bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                 {loading ? <div className="h-4 w-10 bg-gray-200 rounded animate-pulse"></div> : `${filteredVideos.length} فيديو`}
             </div>
             <button onClick={handleManualRefresh} disabled={isRefreshing || loading} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 transition border border-indigo-100">
                <RefreshCw size={14} className={isRefreshing || loading ? 'animate-spin' : ''} />
                تحديث
             </button>
          </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-50/50 text-gray-500 text-xs font-bold border-b border-gray-100">
              <tr>
                <th className="p-4 w-1/2">تفاصيل الفيديو</th>
                <th className="p-4">الأداء</th>
                <th className="p-4"><div className="flex items-center gap-1"><BarChart2 size={12}/> المشاهدات</div></th>
                <th className="p-4"><div className="flex items-center gap-1"><Clock size={12}/> المدة</div></th>
                <th className="p-4 text-center">تحليل AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              
              {/* Skeleton Loading State */}
              {loading && videos.length === 0 && (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                        <td className="p-4"><div className="flex gap-3"><Skeleton variant="rectangular" className="w-32 h-20 rounded-lg"/><div className="flex-1 space-y-2 py-2"><Skeleton variant="text"/><Skeleton variant="text" className="w-1/2"/></div></div></td>
                        <td className="p-4"><Skeleton variant="text" className="w-16"/></td>
                        <td className="p-4"><Skeleton variant="text" className="w-12"/></td>
                        <td className="p-4"><Skeleton variant="text" className="w-12"/></td>
                        <td className="p-4 text-center"><Skeleton variant="rectangular" className="w-24 h-8 mx-auto"/></td>
                    </tr>
                  ))
              )}

              {/* Data Rows */}
              {!loading && filteredVideos.map((video) => (
                <tr key={video.id} className="hover:bg-indigo-50/40 transition group">
                  <td className="p-4">
                    <div className="flex gap-4">
                      <div className="relative flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                         <img src={video.thumbnail} alt={video.title} className="w-32 h-20 object-cover rounded-lg shadow-sm border border-gray-100" />
                         <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                           {video.duration?.replace('PT', '').replace('H', ':').replace('M', ':').replace('S', '')}
                         </div>
                      </div>
                      <div className="flex flex-col justify-center">
                        <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="font-bold text-gray-800 text-sm hover:text-indigo-600 line-clamp-2 leading-relaxed mb-1 transition-colors">
                            {video.title}
                        </a>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded">{new Date(video.publishedAt).toLocaleDateString('ar-EG')}</span>
                            {video.categoryId && <span>• الفئة: {video.categoryId}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-middle">{getStatusBadge(video.performanceStatus)}</td>
                  <td className="p-4 font-mono font-bold text-gray-700 align-middle text-sm">{formatNumber(video.viewCount)}</td>
                  <td className="p-4 text-gray-500 align-middle text-xs font-bold">
                      {video.durationSeconds <= 60 ? <span className="text-pink-600">Shorts ⚡</span> : 'Long Video'}
                  </td>
                  <td className="p-4 align-middle text-center">
                    <button onClick={() => onAnalyze(video)} className="bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto shadow-sm hover:shadow-md group/btn">
                        <Sparkles size={14} className="group-hover/btn:text-yellow-300 transition-colors" /> 
                        استوديو التحسين
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Empty State */}
              {!loading && filteredVideos.length === 0 && (
                  <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                  <Filter size={24} className="opacity-20"/>
                              </div>
                              <p>لا توجد فيديوهات تطابق معايير البحث.</p>
                              <button onClick={() => {setFilterType('ALL'); setTimeFilter(0);}} className="text-indigo-600 text-sm font-bold hover:underline">إعادة تعيين الفلاتر</button>
                          </div>
                      </td>
                  </tr>
              )}

            </tbody>
          </table>
        </div>
        
        {/* Load More Footer */}
        {hasMore && (
            <div className="p-4 text-center border-t border-gray-100 bg-gray-50/50">
                <button onClick={onLoadMore} disabled={loadingMore} className="flex items-center gap-2 mx-auto bg-white border border-gray-200 text-gray-600 px-8 py-2.5 rounded-full hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition shadow-sm disabled:opacity-50 text-sm font-bold">
                    {loadingMore ? <RefreshCw className="animate-spin" size={16}/> : <SkipForward size={16}/>}
                    {loadingMore ? 'جاري جلب المزيد...' : 'عرض المزيد من الفيديوهات'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default VideoList;