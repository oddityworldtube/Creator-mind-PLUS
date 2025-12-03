import { ChannelStats, VideoData, ChannelProfile, CompetitorData, VideoCaption } from '../types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// --- Helpers ---

const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = (parseInt(match[1]) || 0);
  const minutes = (parseInt(match[2]) || 0);
  const seconds = (parseInt(match[3]) || 0);
  return (hours * 3600) + (minutes * 60) + seconds;
};

// Helper to convert VTT/SRT time string (00:00:05.500) to seconds
const timeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    let seconds = 0;
    if (parts.length === 3) {
        seconds += parseFloat(parts[0]) * 3600;
        seconds += parseFloat(parts[1]) * 60;
        seconds += parseFloat(parts[2]);
    } else if (parts.length === 2) {
        seconds += parseFloat(parts[0]) * 60;
        seconds += parseFloat(parts[1]);
    }
    return seconds;
};

// Helper to parse WebVTT format content into VideoCaption objects
const parseVTT = (vttText: string): VideoCaption[] => {
    const lines = vttText.split('\n');
    const captions: VideoCaption[] = [];
    let currentStart = 0;
    let currentEnd = 0;
    let currentText = '';
    
    // Regex for VTT timestamp: 00:00:00.000 --> 00:00:00.000
    const timeRegex = /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('-->')) {
            const match = timeRegex.exec(line);
            if (match) {
                // If we have previous text accumulated, push it
                if (currentText) {
                    captions.push({
                        text: currentText.trim(),
                        start: currentStart,
                        duration: currentEnd - currentStart
                    });
                    currentText = '';
                }
                currentStart = timeToSeconds(match[1]);
                currentEnd = timeToSeconds(match[2]);
            }
        } else if (line && !line.startsWith('WEBVTT') && isNaN(Number(line))) {
            // It's text content (ignoring "WEBVTT" header and sequence numbers)
            currentText += ' ' + line;
        }
    }

    // Push last entry
    if (currentText) {
        captions.push({
            text: currentText.trim(),
            start: currentStart,
            duration: currentEnd - currentStart
        });
    }

    return captions;
};

// --- Read Operations ---

export const fetchChannelStats = async (channelId: string, apiKey: string): Promise<ChannelStats | null> => {
    try {
        let query = `id=${channelId}`;
        if (channelId.startsWith('@')) query = `forHandle=${channelId}`;
        else if (!channelId.startsWith('UC')) query = `forHandle=@${channelId}`;
        
        // Add cache busting
        const timestamp = new Date().getTime();
        const response = await fetch(`${BASE_URL}/channels?part=snippet,statistics,contentDetails&${query}&key=${apiKey}&_t=${timestamp}`);
        
        const data = await response.json();
        if (!data.items || data.items.length === 0) return null;
        const item = data.items[0];
        return {
            title: item.snippet.title,
            description: item.snippet.description,
            customUrl: item.snippet.customUrl,
            subscriberCount: item.statistics.subscriberCount,
            videoCount: item.statistics.videoCount,
            viewCount: item.statistics.viewCount,
            thumbnailUrl: item.snippet.thumbnails.default.url,
        };
    } catch (error) { return null; }
};

export const fetchRecentVideos = async (channelId: string, apiKey: string, pageToken?: string, maxResults: number = 20): Promise<{ videos: VideoData[], nextPageToken?: string }> => {
  try {
    let query = `id=${channelId}`;
    if (channelId.startsWith('@')) query = `forHandle=${channelId}`;
    const channelRes = await fetch(`${BASE_URL}/channels?part=contentDetails&${query}&key=${apiKey}`);
    const channelData = await channelRes.json();
    if (!channelData.items || channelData.items.length === 0) return { videos: [] };
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    let playlistUrl = `${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`;
    if (pageToken) playlistUrl += `&pageToken=${pageToken}`;

    const playlistRes = await fetch(playlistUrl);
    const playlistData = await playlistRes.json();
    if (!playlistData.items) return { videos: [] };

    const nextPageToken = playlistData.nextPageToken;
    const videoIds = playlistData.items.map((item: any) => item.contentDetails.videoId).join(',');

    const videosRes = await fetch(`${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`);
    const videosData = await videosRes.json();

    const videos = videosData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium.url,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics.viewCount,
      likeCount: item.statistics.likeCount,
      commentCount: item.statistics.commentCount,
      duration: item.contentDetails.duration,
      durationSeconds: parseDuration(item.contentDetails.duration),
      categoryId: item.snippet.categoryId || '22', // Default to Blog if missing
      tags: item.snippet.tags || []
    }));
    return { videos, nextPageToken };
  } catch (error) { return { videos: [] }; }
};

// --- NEW: Fetch Video Captions (Transcript) ---
// Note: This requires an OAuth Token with permissions, NOT just an API Key.
// Returns an array of captions or null if failed/not available.
export const fetchVideoCaptions = async (videoId: string, token: string): Promise<VideoCaption[] | null> => {
    try {
        // 1. List available caption tracks for the video
        const listResponse = await fetch(`${BASE_URL}/captions?part=snippet&videoId=${videoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!listResponse.ok) {
            console.warn("Failed to list captions. Status:", listResponse.status);
            return null;
        }

        const listData = await listResponse.json();
        if (!listData.items || listData.items.length === 0) return null;

        // 2. Select the best track (Prefer ASR or manual default language)
        // Logic: Try to find 'ar' or 'en' track, fallback to the first one.
        // ASR tracks usually have kind='asr'. Standard are kind='standard'.
        const items = listData.items;
        let selectedTrack = items.find((t: any) => t.snippet.language === 'ar' && t.snippet.trackKind === 'standard');
        if (!selectedTrack) selectedTrack = items.find((t: any) => t.snippet.language === 'ar');
        if (!selectedTrack) selectedTrack = items.find((t: any) => t.snippet.language === 'en');
        if (!selectedTrack) selectedTrack = items[0]; // Fallback

        const trackId = selectedTrack.id;

        // 3. Download the track
        // 'tfmt=vtt' requests WebVTT format
        const downloadResponse = await fetch(`${BASE_URL}/captions/${trackId}?tfmt=vtt`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!downloadResponse.ok) {
            console.warn("Failed to download caption track.");
            return null;
        }

        const vttText = await downloadResponse.text();
        
        // 4. Parse the VTT text
        return parseVTT(vttText);

    } catch (e) {
        console.error("Exception fetching captions:", e);
        return null;
    }
};

// --- Lightweight Fetcher for Analysis ---
export const fetchVideoTitlesForAnalysis = async (handleOrId: string, apiKey: string): Promise<{title: string}[]> => {
    try {
        let query = `id=${handleOrId}`;
        if (handleOrId.startsWith('@')) query = `forHandle=${handleOrId}`;
        else if (!handleOrId.startsWith('UC')) query = `forHandle=@${handleOrId}`;

        const channelRes = await fetch(`${BASE_URL}/channels?part=contentDetails&${query}&key=${apiKey}`);
        const channelData = await channelRes.json();
        
        if (!channelData.items || channelData.items.length === 0) return [];
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        const playlistRes = await fetch(`${BASE_URL}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=20&key=${apiKey}`);
        const playlistData = await playlistRes.json();
        
        if (!playlistData.items) return [];

        return playlistData.items.map((item: any) => ({
            title: item.snippet.title
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
};

// --- Competitor Analysis Fetcher ---

export const fetchCompetitorData = async (identifier: string, apiKey: string): Promise<CompetitorData | null> => {
    try {
        // 1. Get Channel Basic Info
        let query = `id=${identifier}`;
        if (identifier.startsWith('@')) query = `forHandle=${identifier}`;
        else if (!identifier.startsWith('UC')) query = `forHandle=@${identifier}`;
        
        const response = await fetch(`${BASE_URL}/channels?part=snippet,statistics,contentDetails&${query}&key=${apiKey}`);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) return null;
        const item = data.items[0];
        const uploadsId = item.contentDetails.relatedPlaylists.uploads;

        // 2. Calculate Recent Performance (Last 10 videos avg)
        let recentAvg = 0;
        let lastUpload = '';

        if (uploadsId) {
             const playlistRes = await fetch(`${BASE_URL}/playlistItems?part=contentDetails&playlistId=${uploadsId}&maxResults=10&key=${apiKey}`);
             const playlistData = await playlistRes.json();
             
             if (playlistData.items && playlistData.items.length > 0) {
                 const videoIds = playlistData.items.map((v:any) => v.contentDetails.videoId).join(',');
                 const statsRes = await fetch(`${BASE_URL}/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`);
                 const statsData = await statsRes.json();
                 
                 if (statsData.items) {
                    const totalViews = statsData.items.reduce((acc: number, v: any) => acc + Number(v.statistics.viewCount), 0);
                    recentAvg = Math.round(totalViews / statsData.items.length);
                    lastUpload = statsData.items[0].snippet.publishedAt;
                 }
             }
        }

        return {
            id: Date.now().toString(), // Temporary internal ID
            channelId: item.id,
            title: item.snippet.title,
            customUrl: item.snippet.customUrl,
            subscriberCount: item.statistics.subscriberCount,
            videoCount: item.statistics.videoCount,
            viewCount: item.statistics.viewCount,
            thumbnailUrl: item.snippet.thumbnails.default.url,
            recentVideoAvgViews: recentAvg,
            lastUploadDate: lastUpload
        };

    } catch (e) {
        console.error("Competitor Fetch Error", e);
        return null;
    }
};

// --- OAuth & Write Operations ---

export const refreshAccessToken = async (profile: ChannelProfile): Promise<string | null> => {
  if (!profile.refreshToken || !profile.clientId || !profile.clientSecret) return null;
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: profile.clientId,
        client_secret: profile.clientSecret,
        refresh_token: profile.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await response.json();
    if (data.error) {
        console.error("Token Refresh Error:", data);
        return null;
    }
    return data.access_token || null;
  } catch (error) { 
      console.error("Token Refresh Network Error:", error);
      return null; 
  }
};

export const validateChannelToken = async (profile: ChannelProfile): Promise<{ valid: boolean; status: 'OK' | 'QUOTA' | 'AUTH' | 'NET'; msg: string }> => {
    let token = profile.accessToken;
    // 1. Refresh first to ensure we test a valid token
    const newToken = await refreshAccessToken(profile);
    if (!newToken) {
        return { valid: false, status: 'AUTH', msg: 'فشل تجديد التوكن. صلاحيات غير صالحة.' };
    }
    token = newToken;

    try {
        // 2. Make a very cheap call (1 unit cost) - List Channels mine=true
        const response = await fetch(`${BASE_URL}/channels?part=id&mine=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            return { valid: true, status: 'OK', msg: 'الاتصال والحدود سليمة.' };
        }

        const err = await response.json();
        const reason = err.error?.errors?.[0]?.reason;

        if (reason === 'quotaExceeded') {
            return { valid: false, status: 'QUOTA', msg: 'تم تجاوز الحد اليومي (Quota Exceeded).' };
        }
        
        return { valid: false, status: 'AUTH', msg: `خطأ في الصلاحيات: ${reason || err.error?.message}` };

    } catch (e) {
        return { valid: false, status: 'NET', msg: 'خطأ في الشبكة أثناء التحقق.' };
    }
};


// Convert Base64 Data URL to Blob
const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]); 
    let n = bstr.length; 
    const u8arr = new Uint8Array(n);
    // Standard for loop to avoid syntax errors with decrement operator in some environments
    for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], {type:mime});
};

export const uploadCustomThumbnail = async (videoId: string, base64Image: string, token: string): Promise<{ success: boolean; msg: string; errorReason?: string }> => {
    try {
        const blob = dataURLtoBlob(base64Image);
        
        // 1. Check size (YouTube limit is 2MB)
        if (blob.size > 2 * 1024 * 1024) {
             return { success: false, msg: "حجم الصورة أكبر من 2 ميجابايت. يرجى تقليل الجودة أو الأبعاد." };
        }

        const response = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': blob.type,
            },
            body: blob
        });
        
        if (!response.ok) {
            const err = await response.json();
            const reason = err.error?.errors?.[0]?.reason;
            let msg = `فشل رفع الصورة: ${err.error?.message || response.statusText}`;
            
            if (reason === 'quotaExceeded') msg = "⛔ تم تجاوز حد الرفع اليومي (Quota).";
            
            return { success: false, msg: msg, errorReason: reason };
        }
        return { success: true, msg: "Thumbnail updated" };
    } catch (e: any) {
        return { success: false, msg: `خطأ شبكة أثناء رفع الصورة: ${e.message}` };
    }
};

export const updateVideoDetails = async (
  video: VideoData,
  details: { title: string, description: string, tags: string[], thumbnailBase64?: string | null },
  profile: ChannelProfile
): Promise<{ success: boolean; msg: string; errorReason?: string }> => {
  
  let token = profile.accessToken;
  
  // 1. Force Refresh if no token or to be safe
  const newToken = await refreshAccessToken(profile);
  if (newToken) {
      token = newToken;
  } else if (!token) {
      return { success: false, msg: "فشل تجديد رمز الدخول (Token). يرجى التحقق من ملفات التوثيق.", errorReason: 'auth_error' };
  }

  try {
    // 2. Fetch the CURRENT video details to get the REAL Category ID
    const fetchCurrentRes = await fetch(`${BASE_URL}/videos?part=snippet&id=${video.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    let realCategoryId = '22'; // Default fallback
    if (fetchCurrentRes.ok) {
        const currentData = await fetchCurrentRes.json();
        if (currentData.items && currentData.items.length > 0) {
            realCategoryId = currentData.items[0].snippet.categoryId;
        }
    }

    // 3. Prepare Payload
    const resource = {
        id: video.id,
        snippet: {
          title: details.title,
          description: details.description,
          tags: details.tags ?? [],
          categoryId: realCategoryId
        }
    };

    // 4. Update Text Metadata
    const response = await fetch(`${BASE_URL}/videos?part=snippet`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource)
    });
    
    if (!response.ok) {
        const err = await response.json();
        console.error("Youtube API Error Full:", JSON.stringify(err, null, 2));
        
        let errorMsg = err.error?.message || "خطأ غير معروف من يوتيوب";
        const reason = err.error?.errors?.[0]?.reason;

        if (reason === 'quotaExceeded') {
            errorMsg = "⛔ عذراً! تجاوزت الحد اليومي (Quota Exceeded).";
        } else if (err.error?.code === 403) {
             errorMsg = `غير مصرح (403): تأكد من صلاحيات التوكن (Scope).`;
        } else if (err.error?.code === 400) {
             errorMsg = `بيانات غير صالحة (400): قد تكون الكلمات الدلالية تحتوي على رموز ممنوعة.`;
        }
        
        return { success: false, msg: errorMsg, errorReason: reason };
    }

    // 5. Upload Thumbnail (if provided)
    if (details.thumbnailBase64) {
        await new Promise(r => setTimeout(r, 800)); // Safety delay
        const thumbRes = await uploadCustomThumbnail(video.id, details.thumbnailBase64, token!);
        if (!thumbRes.success) {
            return { success: true, msg: `تم تحديث النصوص بنجاح، ولكن فشل رفع الصورة: ${thumbRes.msg}`, errorReason: thumbRes.errorReason };
        }
    }

    return { success: true, msg: "تم نشر التحديثات على يوتيوب بنجاح! 🚀" };

  } catch (e: any) {
    console.error("FATAL EXCEPTION", e);
    return { success: false, msg: `خطأ في الاتصال: ${e.message}` };
  }
};