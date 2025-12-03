
import React, { useState, useMemo } from 'react';
import { ChannelStats, VideoData, AnalysisResult, ChannelProfile } from '../types';
import { analyzeChannel } from '../services/geminiService';
import { Brain, Sparkles, CheckCircle, Lightbulb, BarChart2, Zap } from 'lucide-react';

interface AnalysisProps {
  stats: ChannelStats;
  videos: VideoData[];
  profile: ChannelProfile;
}

const Analysis: React.FC<AnalysisProps> = ({ stats, videos, profile }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalysis = async () => {
    setLoading(true);
    // Pass channel specific key if available
    const result = await analyzeChannel(stats, videos, profile.geminiApiKey);
    setAnalysis(result);
    setLoading(false);
  };

  // Static Heuristic Analysis (Before AI)
  const staticInsights = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    
    const insights = [];
    
    // 1. Shorts vs Long Performance
    const shorts = videos.filter(v => v.durationSeconds <= 60);
    const long = videos.filter(v => v.durationSeconds > 60);
    
    const avgShorts = shorts.length ? shorts.reduce((a, b) => a + Number(b.viewCount), 0) / shorts.length : 0;
    const avgLong = long.length ? long.reduce((a, b) => a + Number(b.viewCount), 0) / long.length : 0;

    if (avgShorts > avgLong * 1.5) {
        insights.push({ type: 'trend', text: 'جمهورك يميل بقوة نحو الفيديوهات القصيرة (Shorts). كثف النشر هنا.' });
    } else if (avgLong > avgShorts * 1.5) {
        insights.push({ type: 'trend', text: 'الفيديوهات الطويلة تحقق أداءً أفضل، ركز على المحتوى العميق.' });
    }

    // 2. Best Day/Time (Simple heuristic based on recent top videos)
    const topVideos = [...videos].sort((a, b) => Number(b.viewCount) - Number(a.viewCount)).slice(0, 5);
    const days = topVideos.map(v => new Date(v.publishedAt).toLocaleDateString('ar-EG', { weekday: 'long' }));
    const mostFreqDay = days.sort((a,b) => days.filter(v => v===a).length - days.filter(v => v===b).length).pop();
    insights.push({ type: 'time', text: `يبدو أن أفضل فيديوهاتك تم نشرها يوم: ${mostFreqDay}` });

    return insights;
  }, [videos]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Static Analysis Section (Immediate Value) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart2 className="text-blue-600" />
            تحليل البيانات الأولية (إحصائيات يوتيوب)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staticInsights.map((insight, idx) => (
                <div key={idx} className="bg-white p-4 rounded border border-blue-100 flex items-start gap-3">
                    <Zap className="text-yellow-500 mt-1" size={18} />
                    <p className="text-gray-700 text-sm font-medium">{insight.text}</p>
                </div>
            ))}
            <div className="bg-white p-4 rounded border border-blue-100 flex items-start gap-3">
                <CheckCircle className="text-green-500 mt-1" size={18} />
                <p className="text-gray-700 text-sm font-medium">
                    متوسط المشاهدات لآخر {videos.length} فيديو: {Math.round(videos.reduce((a,v) => a+Number(v.viewCount), 0) / videos.length).toLocaleString()}
                </p>
            </div>
        </div>
      </div>

      {/* 2. Call to Action for AI Analysis */}
      {!analysis && !loading && (
        <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-indigo-600 text-center">
            <Brain className="w-16 h-16 mx-auto mb-4 text-indigo-100" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">التحليل الاستراتيجي العميق</h2>
            <p className="text-gray-500 mb-6 max-w-lg mx-auto">
                دع الذكاء الاصطناعي يقرأ هذه البيانات ويضع لك خطة عمل، ويقيم استراتيجيتك الحالية، ويقترح عليك أفكاراً جديدة.
            </p>
            <button 
            onClick={handleAnalysis}
            className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition shadow-lg flex items-center gap-2 mx-auto"
            >
            <Sparkles size={20} />
            تحليل القناة بالكامل الآن
            </button>
        </div>
      )}

      {loading && (
        <div className="bg-white p-12 rounded-lg shadow-sm flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
            <h3 className="text-xl font-bold text-gray-700">جاري تحليل القناة باستخدام الذكاء الاصطناعي...</h3>
            <p className="text-gray-500 mt-2">جاري فحص {videos.length} فيديو واستخراج الأنماط</p>
        </div>
      )}

      {/* 3. AI Results */}
      {analysis && (
        <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-indigo-500 flex items-center justify-between">
                <div>
                <h3 className="text-xl font-bold text-gray-800">تقييم القناة العام</h3>
                <p className="text-gray-500">بناءً على التفاعل، النمو، وجودة العناوين</p>
                </div>
                <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                        className="text-gray-200"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                    />
                    <path
                        className="text-indigo-600"
                        strokeDasharray={`${analysis.overallScore}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                    />
                    </svg>
                    <span className="absolute text-2xl font-bold text-indigo-700">{analysis.overallScore}%</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Strategy Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Lightbulb className="text-yellow-500" />
                    الخطة الاستراتيجية
                </h3>
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {analysis.strategy}
                </div>
                </div>

                {/* Video Suggestions Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <CheckCircle className="text-green-500" />
                    تحسينات الفيديوهات المقترحة
                </h3>
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {analysis.videoSuggestions}
                </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;