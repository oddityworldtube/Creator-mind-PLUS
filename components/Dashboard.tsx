import React from 'react';
import { ChannelStats, VideoData } from '../types';
import { Users, PlaySquare, Eye, TrendingUp, RefreshCw, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import StatCard from './dashboard/StatCard';
import PerformanceChart from './dashboard/PerformanceChart';

interface DashboardProps {
  stats: ChannelStats;
  videos: VideoData[];
  onRefresh: () => void;
  loading: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, videos, onRefresh, loading }) => {
  const formatNumber = (numStr: string) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(Number(numStr));
  };

  const goldenRules = [
      { type: 'info', msg: "تأكد من وجود كلمات دلالية (Keywords) في أول 60 حرف من العنوان." },
      { type: 'success', msg: "معدل نشر الفيديوهات ثابت، استمر على هذا المنوال!" },
      { type: 'warning', msg: "حاول استخدام صور مصغرة ذات تباين ألوان عالي لزيادة نسبة النقر (CTR)." }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Profile */}
      <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-6 border border-gray-100">
        <div className="relative">
            <img 
                src={stats.thumbnailUrl} 
                alt={stats.title} 
                className="w-20 h-20 rounded-full border-4 border-indigo-50 shadow-md object-cover"
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="text-center md:text-right flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 mb-1">{stats.title}</h1>
                    <p className="text-gray-500 text-sm">{stats.customUrl}</p>
                </div>
                <button 
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'جاري التحديث...' : 'تحديث البيانات'}
                </button>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="المشتركين" value={stats.subscriberCount} icon={<Users size={24} />} color="#4f46e5" />
        <StatCard title="إجمالي المشاهدات" value={stats.viewCount} icon={<Eye size={24} />} color="#0ea5e9" />
        <StatCard title="عدد الفيديوهات" value={stats.videoCount} icon={<PlaySquare size={24} />} color="#ef4444" />
        <StatCard title="تفاعل (آخر 10)" value={String(videos.slice(0,10).reduce((acc, v) => acc + Number(v.likeCount) + Number(v.commentCount), 0))} icon={<TrendingUp size={24} />} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">أداء أحدث الفيديوهات</h3>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">مشاهدات</span>
          </div>
          <PerformanceChart videos={videos} />
        </div>

        {/* Rules */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-500"/>
                نصائح سريعة
            </h3>
            <div className="space-y-4">
                {goldenRules.map((rule, idx) => (
                    <div key={idx} className={`p-4 rounded-xl text-sm leading-relaxed border ${
                        rule.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 
                        rule.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' : 
                        'bg-blue-50 border-blue-100 text-blue-800'
                    }`}>
                        {rule.msg}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;