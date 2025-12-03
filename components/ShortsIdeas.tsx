
import React, { useState, useMemo } from 'react';
import { VideoData, ShortsToLongResult, ChannelProfile } from '../types';
import { generateLongFormIdeas } from '../services/geminiService';
import { Zap, ArrowRight, PlayCircle, Sparkles } from 'lucide-react';

interface ShortsIdeasProps {
  videos: VideoData[];
  profile: ChannelProfile;
}

const ShortsIdeas: React.FC<ShortsIdeasProps> = ({ videos, profile }) => {
  const [ideas, setIdeas] = useState<ShortsToLongResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter top shorts
  const topShorts = useMemo(() => {
    return videos
      .filter(v => v.durationSeconds <= 60)
      .sort((a, b) => Number(b.viewCount) - Number(a.viewCount))
      .slice(0, 5);
  }, [videos]);

  const handleGenerate = async () => {
    setLoading(true);
    // Pass specific key
    const result = await generateLongFormIdeas(topShorts, profile.geminiApiKey);
    setIdeas(result);
    setLoading(false);
  };

  if (topShorts.length === 0) {
    return (
        <div className="text-center py-10 bg-white rounded-lg">
            <p className="text-gray-500">لا توجد فيديوهات Shorts كافية لتحليلها حالياً.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-lg shadow-md text-white">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Zap className="text-yellow-300" fill="currentColor" />
                تحويل نجاح الشورتس إلى فيديوهات طويلة
            </h2>
            <p className="text-purple-100 mb-6 max-w-3xl">
                نستخدم الذكاء الاصطناعي لتحليل أفضل 5 فيديوهات قصيرة (Shorts) لديك واقتراح عناوين لفيديوهات طويلة تتوسع في نفس المواضيع لجذب المشتركين.
            </p>
            
            {!loading && ideas.length === 0 && (
                <button 
                    onClick={handleGenerate}
                    className="bg-white text-indigo-700 px-6 py-2 rounded-full font-bold hover:bg-purple-50 transition shadow-lg flex items-center gap-2"
                >
                    <Sparkles size={18} />
                    توليد الأفكار الآن
                </button>
            )}
            
            {loading && (
                <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-lg w-fit">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري تحليل الشورتس وتوليد العناوين...</span>
                </div>
            )}
        </div>

        {ideas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ideas.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                        <div className="bg-gray-50 p-4 border-b">
                            <span className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1 block">مستوحى من الشورت:</span>
                            <h3 className="font-bold text-gray-800 line-clamp-2">{item.shortTitle}</h3>
                        </div>
                        <div className="p-4">
                            <h4 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1">
                                <PlayCircle size={14} />
                                مقترحات الفيديوهات الطويلة:
                            </h4>
                            <ul className="space-y-3">
                                {item.longIdeas.map((idea, i) => (
                                    <li key={i} className="flex items-start gap-2 bg-indigo-50/50 p-2 rounded text-gray-700 text-sm">
                                        <ArrowRight size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                                        {idea}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default ShortsIdeas;