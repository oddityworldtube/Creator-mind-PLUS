import React, { useState, useEffect } from 'react';
import { ChannelStats, VideoData } from './types';
import { fetchChannelStats, fetchRecentVideos } from './services/youtubeService';
import { ToastProvider } from './contexts/ToastContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import VaultScreen from './components/VaultScreen';
import Settings from './components/Settings';
import Dashboard from './components/Dashboard';
import VideoList from './components/VideoList';
import Analysis from './components/Analysis';
import ShortsIdeas from './components/ShortsIdeas';
import VideoOptimizer from './components/VideoOptimizer';
import CompetitorAnalysis from './components/CompetitorAnalysis';
import IdeaGenerator from './components/IdeaGenerator';
import { LayoutDashboard, Settings as SettingsIcon, Video, Youtube, Zap, Wand2, PlusCircle, Target, Lightbulb, Moon, Sun } from 'lucide-react';

const AppContent: React.FC = () => {
  const { profiles, currentProfileId, isLoading, theme, setTheme, selectProfile } = useAppContext();
  
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null);
  const [recentVideos, setRecentVideos] = useState<VideoData[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'videos' | 'analysis' | 'shorts_ideas' | 'optimizer' | 'settings' | 'competitors' | 'ideas'>('settings');
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Load initial data when profile changes
  useEffect(() => {
    if (profiles.length > 0 && !currentProfileId) {
        selectProfile(profiles[0].id);
        setActiveTab('dashboard');
    } else if (profiles.length === 0) {
        setActiveTab('settings');
    }
  }, [profiles, currentProfileId]);

  const loadData = async () => {
      if (!currentProfileId) return;
      const profile = profiles.find(c => c.id === currentProfileId);
      if (!profile) return;
      
      setLoadingData(true);
      const stats = await fetchChannelStats(profile.channelId, profile.apiKey);
      if (stats) {
        setChannelStats(stats);
        const { videos: rawVideos, nextPageToken: token } = await fetchRecentVideos(profile.channelId, profile.apiKey, undefined, 50); 
        setNextPageToken(token);
        setRecentVideos(rawVideos);
      } else {
        setChannelStats(null);
      }
      setLoadingData(false);
  };

  useEffect(() => {
    if (!isLoading && currentProfileId) {
        loadData();
    }
  }, [currentProfileId, isLoading]);

  const handleLoadMore = async () => {
    if (!nextPageToken || !currentProfileId) return;
    const profile = profiles.find(c => c.id === currentProfileId);
    if (!profile) return;
    setLoadingMore(true);
    const { videos: newVideos, nextPageToken: newToken } = await fetchRecentVideos(profile.channelId, profile.apiKey, nextPageToken, 50);
    setNextPageToken(newToken);
    setRecentVideos(prev => [...prev, ...newVideos]);
    setLoadingMore(false);
  };

  const currentProfile = profiles.find(c => c.id === currentProfileId) || null;

  // Render Loading Splash
  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">جاري فك تشفير البيانات...</h2>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-slate-50 dark:bg-slate-950 text-right transition-colors duration-300" dir="rtl">
      {/* Sidebar */}
      <aside className="lg:w-72 bg-slate-900 dark:bg-slate-950 text-white flex-shrink-0 lg:fixed h-full z-20 shadow-xl transition-all flex flex-col justify-between border-l dark:border-slate-800">
        <div>
            <div className="p-8 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <Youtube className="w-6 h-6 text-white" fill="currentColor" />
                    </div>
                    <div>
                        <span className="font-black text-xl tracking-tight block leading-none">CreatorMind</span>
                        <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase opacity-80">PRO</span>
                    </div>
                </div>
            </div>
            
            <nav className="p-4 space-y-1.5">
                {!currentProfile ? (
                     <div className="text-center p-6 bg-slate-800/50 rounded-xl mb-4 border border-slate-700 border-dashed m-2">
                         <p className="text-slate-400 text-sm mb-3 font-bold">ابدأ بإضافة قناتك</p>
                         <button onClick={() => setActiveTab('settings')} className="text-white bg-indigo-600 w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/50">
                             <PlusCircle size={16}/> إضافة قناة
                         </button>
                     </div>
                ) : (
                    <>
                    <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-bold text-sm ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <LayoutDashboard size={18} /><span>لوحة التحكم</span>
                    </button>
                    <button onClick={() => setActiveTab('videos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-bold text-sm ${activeTab === 'videos' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Video size={18} /><span>المحتوى</span>
                    </button>
                    <button onClick={() => setActiveTab('ideas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-bold text-sm ${activeTab === 'ideas' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Lightbulb size={18} className={activeTab === 'ideas' ? "text-yellow-300" : ""} /><span>مولد الأفكار</span>
                    </button>
                    <button onClick={() => setActiveTab('competitors')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-bold text-sm ${activeTab === 'competitors' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Target size={18} /><span>تحليل المنافسين</span>
                    </button>
                    <button onClick={() => { setSelectedVideo(selectedVideo || (recentVideos[0] || null)); setActiveTab('optimizer'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-bold text-sm ${activeTab === 'optimizer' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Wand2 size={18} /><span>استوديو التحسين</span>
                    </button>
                    <button onClick={() => setActiveTab('shorts_ideas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-bold text-sm ${activeTab === 'shorts_ideas' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Zap size={18} className={activeTab !== 'shorts_ideas' ? "text-yellow-500" : ""} /><span>أفكار Shorts</span>
                    </button>
                    </>
                )}
            </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
             <div className="flex gap-2 mb-3">
                 <button onClick={() => setActiveTab('settings')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition font-bold text-xs ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-slate-800 hover:text-white'}`}>
                      <SettingsIcon size={16} /><span>الإعدادات</span>
                 </button>
                 <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 transition">
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                 </button>
             </div>
             
             {currentProfile && (
                 <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-lg border border-slate-800">
                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                     <span className="text-xs text-slate-300 font-mono truncate max-w-[120px]">{currentProfile.name}</span>
                 </div>
             )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:mr-72 p-4 lg:p-8 overflow-y-auto h-screen custom-scrollbar">
        {loadingData && activeTab !== 'settings' ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400 gap-6">
              <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
              <p className="animate-pulse font-bold text-lg text-slate-500">جاري الاتصال بقناتك...</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {activeTab === 'settings' && <Settings />}
            
            {activeTab === 'dashboard' && channelStats && <Dashboard stats={channelStats} videos={recentVideos} onRefresh={loadData} loading={loadingData} />}
            
            {activeTab === 'videos' && <VideoList videos={recentVideos} channelStats={channelStats} onLoadMore={handleLoadMore} hasMore={!!nextPageToken} loadingMore={loadingMore} loading={loadingData} onAnalyze={(v) => { setSelectedVideo(v); setActiveTab('optimizer'); }} onRefresh={loadData} />}
            
            {activeTab === 'ideas' && currentProfile && <IdeaGenerator profile={currentProfile} />}

            {activeTab === 'competitors' && channelStats && currentProfile && <CompetitorAnalysis myStats={channelStats} profile={currentProfile} />}

            {activeTab === 'shorts_ideas' && currentProfile && <ShortsIdeas videos={recentVideos} profile={currentProfile} />}
            
            {activeTab === 'analysis' && channelStats && currentProfile && <Analysis stats={channelStats} videos={recentVideos} profile={currentProfile} />}
            
            {activeTab === 'optimizer' && selectedVideo ? (
                <VideoOptimizer video={selectedVideo} profile={currentProfile} allVideos={recentVideos} />
            ) : activeTab === 'optimizer' && !selectedVideo ? (
                 <div className="flex flex-col items-center justify-center py-32 text-gray-400 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-300 dark:border-slate-800 shadow-sm transition-colors">
                     <Wand2 size={40} className="text-indigo-500 mb-4" />
                     <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-2">لم يتم اختيار فيديو للتحليل</h3>
                     <button onClick={() => setActiveTab('videos')} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg mt-4 flex items-center gap-2">
                        <Video size={18}/> الذهاب للمحتوى
                     </button>
                 </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
    const [unlockedKey, setUnlockedKey] = useState<CryptoKey | null>(null);

    // لو مفيش مفتاح، اعرض شاشة القفل
    if (!unlockedKey) {
        return <VaultScreen onUnlock={(key) => setUnlockedKey(key)} />;
    }

    return (
        <AppProvider masterKey={unlockedKey}>
            <ToastProvider>
                <AppContent />
            </ToastProvider>
        </AppProvider>
    );
};

export default App;