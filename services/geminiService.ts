import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { 
    ChannelStats, 
    VideoData, 
    AnalysisResult, 
    ShortsToLongResult, 
    OptimizationResult, 
    ScoredHook, 
    ScoredTitle, 
    ScoredTag, 
    CompetitorData, 
    CompetitorAnalysisResult, 
    Idea,
    ThumbnailAnalysis,
    ContentInsights
} from '../types';

// --- Zod Schemas ---

const PsychologySchema = z.object({
    curiosityScore: z.number().default(0),
    urgencyScore: z.number().default(0),
    emotionType: z.string().default('محايد'),
    powerWords: z.array(z.string()).default([]),
    analysis: z.string().default('')
});

const TitleSuggestionSchema = z.object({
    title: z.string(),
    score: z.number(),
    psychology: PsychologySchema.optional()
});

const OptimizationResultSchema = z.object({
    optimizedTitleSuggestions: z.array(TitleSuggestionSchema).default([]),
    optimizedDescription: z.string().default(''),
    scoredTags: z.array(z.object({ tag: z.string(), score: z.number() })).default([]),
    suggestedTags: z.array(z.object({ tag: z.string(), score: z.number() })).default([]),
    thumbnailPrompt: z.string().default(''),
    thumbnailHooks: z.array(z.object({ hook: z.string(), score: z.number() })).default([]),
    relatedVideos: z.array(z.object({ title: z.string(), videoId: z.string(), relevanceReason: z.string() })).default([])
});

const getGeminiKeys = (): string[] => {
    const savedSettings = localStorage.getItem('yt_analyzer_settings');
    if (savedSettings) {
        try {
            // Check if encrypted
            if (!savedSettings.startsWith('enc_')) {
                const parsed = JSON.parse(savedSettings);
                if (parsed.geminiApiKeys && parsed.geminiApiKeys.length > 0) return parsed.geminiApiKeys;
            }
        } catch (e) {}
    }
    return process.env.API_KEY ? [process.env.API_KEY] : [];
};

let currentKeyIndex = 0;

const executeWithRotation = async <T>(operation: (ai: GoogleGenAI) => Promise<T>, apiKeyOverride?: string): Promise<T> => {
    if (apiKeyOverride && apiKeyOverride.trim().length > 0) {
        try {
            const ai = new GoogleGenAI({ apiKey: apiKeyOverride });
            return await operation(ai);
        } catch (error) {
            console.error("Channel specific Gemini Key failed:", error);
            throw new Error("Invalid Channel Gemini API Key");
        }
    }

    const keys = getGeminiKeys();
    if (keys.length === 0) throw new Error("No Gemini API Keys found");
    
    let attempts = 0;
    while (attempts < keys.length) {
        const key = keys[currentKeyIndex];
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            return await operation(ai);
        } catch (error: any) {
            console.warn(`Key ...${key.slice(-4)} failed`, error);
            currentKeyIndex = (currentKeyIndex + 1) % keys.length;
            attempts++;
            if (attempts >= keys.length) throw error;
        }
    }
    throw new Error("All API keys failed");
};

const cleanJson = (text: string) => {
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  let startIndex = -1;
  if (firstBrace !== -1 && firstBracket !== -1) startIndex = Math.min(firstBrace, firstBracket);
  else if (firstBrace !== -1) startIndex = firstBrace;
  else if (firstBracket !== -1) startIndex = firstBracket;

  if (startIndex !== -1) {
      const lastBrace = cleaned.lastIndexOf('}');
      const lastBracket = cleaned.lastIndexOf(']');
      const endIndex = Math.max(lastBrace, lastBracket);
      if (endIndex > startIndex) cleaned = cleaned.substring(startIndex, endIndex + 1);
  }
  return cleaned;
};

// --- CORE ANALYTICS ---

export const analyzeChannel = async (stats: ChannelStats, videos: VideoData[], apiKey?: string): Promise<AnalysisResult> => {
    return executeWithRotation(async (ai) => {
        const totalViews = videos.reduce((acc, v) => acc + Number(v.viewCount), 0);
        const avgViews = totalViews / (videos.length || 1);
        const processedVideos = videos.slice(0, 30).map(v => ({
            title: v.title,
            publishedAt: v.publishedAt,
            metrics: { views: Number(v.viewCount) }
        }));

        const prompt = `
            Analyze Channel: ${stats.title}. Avg Views: ${Math.round(avgViews)}.
            Videos: ${JSON.stringify(processedVideos)}
            **IMPORTANT**: Output the analysis strictly in **ARABIC LANGUAGE**.
            Return JSON: { "strategy": "...", "videoSuggestions": "...", "overallScore": 0-100 }
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const raw = JSON.parse(cleanJson(response.text || "{}"));
        return raw;
    }, apiKey);
};

export const analyzeChannelNiches = async (videos: {title: string}[], apiKey?: string): Promise<string[]> => {
    return executeWithRotation(async (ai) => {
        const videoTitles = videos.slice(0, 40).map(v => v.title).join('\n');
        const prompt = `
            Analyze these video titles from a YouTube channel:
            ${videoTitles}
            Identify the top 5 most effective "Sub-Niches".
            Focus on high-traffic, search-friendly terms in **Arabic**.
            Return ONLY a JSON array of strings.
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const raw = JSON.parse(cleanJson(response.text || "[]"));
        return z.array(z.string()).parse(raw);
    }, apiKey);
};

export const generateTrendingNiches = async (category: string, apiKey?: string): Promise<{name: string, rating: number}[]> => {
    return executeWithRotation(async (ai) => {
        const prompt = `
            Generate 5 NEW, TRENDING YouTube sub-niches for the category: "${category}".
            Output must be in **Arabic**.
            Return JSON Array: [{ "name": "Niche Name", "rating": 95 }]
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    }, apiKey);
};

export const generateLongFormIdeas = async (shorts: VideoData[], apiKey?: string): Promise<ShortsToLongResult[]> => {
    return executeWithRotation(async (ai) => {
        const shortsList = shorts.map(s => s.title);
        const prompt = `Suggest long videos from these shorts: ${JSON.stringify(shortsList)}. 
        Output JSON array {shortTitle, longIdeas[]}.
        **IMPORTANT: All ideas must be in Arabic.**`;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    }, apiKey);
};

export const optimizeVideoMetadata = async (video: VideoData, channelVideos: VideoData[], apiKey?: string, hookLanguage: string = 'Arabic'): Promise<OptimizationResult> => {
    return executeWithRotation(async (ai) => {
        const channelContext = channelVideos
            .filter(v => v.id !== video.id)
            .slice(0, 100)
            .map(v => ({ id: v.id, title: v.title }));

        const mainPrompt = `
            Act as a World-Class YouTube Strategist. Optimize this video for maximum CTR and Retention.
            Video Info: Title: ${video.title} Desc: ${video.description || ""} Tags: ${video.tags?.join(',') || ""}
            Context: ${JSON.stringify(channelContext)}

            **CRITICAL INSTRUCTION: ALL OUTPUT MUST BE IN ARABIC LANGUAGE.**

            Requirements:
            1. Title: 5 viral variants. Include 'psychology' object { curiosityScore, urgencyScore, emotionType, powerWords, analysis }.
            2. Desc: SEO-rich.
            3. Tags: Rate CURRENT tags. Suggest 15 NEW tags.
            4. Related Videos: Pick 5 best videos.
            5. Thumbnail: Visual prompt.
            6. Hooks: 10 Short text overlays in ${hookLanguage}.

            Return JSON matching OptimizationResult structure.
        `;

        const mainResponse = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: mainPrompt,
            config: { responseMimeType: "application/json" }
        });

        // Vision Analysis (Optional)
        let visionResult = null;
        if (video.thumbnail) {
            visionResult = await analyzeThumbnailVision(video.thumbnail, video.title, apiKey);
        }

        // Transcript Analysis (Optional)
        let transcriptResult = null;
        if (video.captions && video.captions.length > 0) {
            const captionText = video.captions.map(c => c.text).join(" ");
            transcriptResult = await analyzeVideoTranscript(captionText, apiKey);
        }

        const rawMain = JSON.parse(cleanJson(mainResponse.text || "{}"));
        
        const parsedMain = OptimizationResultSchema.safeParse(rawMain);
        
        let finalMain;
        if (parsedMain.success) {
            finalMain = parsedMain.data;
        } else {
            console.error("Zod Validation Error:", parsedMain.error);
            finalMain = {
                optimizedTitleSuggestions: [],
                optimizedDescription: "",
                scoredTags: [],
                suggestedTags: [],
                thumbnailPrompt: "",
                thumbnailHooks: [],
                relatedVideos: [],
                ...rawMain 
            };
        }

        return {
            ...finalMain,
            thumbnailAnalysis: visionResult || undefined,
            contentInsights: transcriptResult || undefined
        };
    }, apiKey);
};

export const analyzeThumbnailVision = async (thumbnailUrl: string, videoTitle: string, apiKey?: string): Promise<ThumbnailAnalysis | null> => {
    return executeWithRotation(async (ai) => {
        try {
            // Attempt to fetch if accessible (CORS might block this in browser)
            const response = await fetch(thumbnailUrl);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
            const base64Data = base64.split(',')[1];
            
            const prompt = `
                Analyze this YouTube thumbnail for video: "${videoTitle}".
                Evaluate: Text readability, Face detection, Colors, Composition.
                Provide critique and improvements.
                Output in **ARABIC**.
                Return JSON: { "score": 80, "critique": ["text too small"], "improvements": ["make text bigger"], "colorProfile": "Vibrant", "faceDetected": true, "textReadability": "Medium" }
            `;
            
            const aiRes = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: [
                    { inlineData: { mimeType: blob.type, data: base64Data } },
                    { text: prompt }
                ],
                config: { responseMimeType: "application/json" }
            });
            
            return JSON.parse(cleanJson(aiRes.text || "{}"));
        } catch (e) {
            console.warn("Vision analysis failed", e);
            return null;
        }
    }, apiKey);
};

export const analyzeVideoTranscript = async (captions: string, apiKey?: string): Promise<ContentInsights | null> => {
    return executeWithRotation(async (ai) => {
        const text = captions.substring(0, 50000); 
        const prompt = `
            Analyze this video transcript.
            Determine: Sentiment, Pacing, Key Topics, Summary, Hook Effectiveness (first few lines).
            Output in **ARABIC**.
            Return JSON matching ContentInsights interface: { "summary": "...", "keyTopics": ["..."], "sentiment": "Positive", "pacingScore": 80, "hookEffectiveness": 90 }
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                { text: prompt },
                { text: text }
            ],
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    }, apiKey);
};

export const generateEnhancedImagePrompt = async (videoTitle: string, videoDesc: string, apiKey?: string): Promise<string> => {
    return executeWithRotation(async (ai) => {
        const prompt = `Create a detailed image generation prompt for a YouTube thumbnail based on: "${videoTitle}". Describe lighting, composition, and style. Output English prompt only.`;
        const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
        return response.text.trim();
    }, apiKey);
};

export interface ImageGenOptions {
    prompt: string;
    negativePrompt?: string;
    style?: string;
}

export const generateThumbnailImage = async (options: ImageGenOptions | string, mode: 'normal' | 'composite' = 'normal', apiKey?: string): Promise<string | null> => {
    return executeWithRotation(async (ai) => {
        try {
            let finalPrompt = typeof options === 'string' ? options : options.prompt;
            let style = typeof options === 'string' ? "" : options.style;
            if (!style) style = "High Quality YouTube Thumbnail, 8k";
            finalPrompt = `${finalPrompt}, ${style}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-image',
                contents: finalPrompt,
            });
            if (response.candidates && response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            return null;
        } catch (e) { return null; }
    }, apiKey);
};

export const analyzeCompetitors = async (myStats: ChannelStats, competitor: CompetitorData, apiKey?: string): Promise<CompetitorAnalysisResult> => {
    return executeWithRotation(async (ai) => {
         const prompt = `Compare channel ${myStats.title} with ${competitor.title}. Return JSON with strengths, weaknesses, opportunities, actionableTips, comparisonSummary, competitorContentIdeas. Output in Arabic.`;
         const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt, config: { responseMimeType: "application/json"} });
         return JSON.parse(cleanJson(response.text || "{}"));
    }, apiKey);
};

// --- Single Task Generators (Fix for "Buttons not working") ---

export const generateTitlesOnly = async (currentTitle: string, apiKey?: string): Promise<ScoredTitle[]> => {
    return executeWithRotation(async (ai) => {
        const prompt = `
            Generate 5 viral YouTube titles based on this topic: "${currentTitle}".
            Analyze the psychology (Curiosity, Urgency, Emotion).
            Output strictly in **ARABIC**.
            Return JSON: { "titles": [{ "title": "...", "score": 90, "psychology": { "curiosityScore": 85, "urgencyScore": 70, "emotionType": "Shock", "powerWords": ["word1"], "analysis": "brief reason" } }] }
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const raw = JSON.parse(cleanJson(response.text || "{}"));
        return raw.titles || [];
    }, apiKey);
};

export const generateDescriptionOnly = async (title: string, currentDesc: string, apiKey?: string): Promise<string> => {
    return executeWithRotation(async (ai) => {
        const prompt = `
            Write a high-retention, SEO-optimized YouTube description in **ARABIC** for:
            Title: ${title}
            Context/Notes: ${currentDesc}
            Include: Hook, content summary, timestamps placeholder, and call to action.
            Return plain text.
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt
        });
        return response.text || "";
    }, apiKey);
};

export const generateTagsOnly = async (title: string, currentTags: string[], apiKey?: string): Promise<ScoredTag[]> => {
    return executeWithRotation(async (ai) => {
        const prompt = `
            Suggest 15 high-volume search tags for YouTube video: "${title}".
            Current tags: ${currentTags.join(',')}.
            Output in **ARABIC**.
            Return JSON: [{ "tag": "...", "score": 95 }]
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    }, apiKey);
};

export const generateThumbnailHooks = async (title: string, language: string = 'Arabic', apiKey?: string): Promise<ScoredHook[]> => {
    return executeWithRotation(async (ai) => {
        const prompt = `
            Generate 10 short, punchy text overlays (hooks) for a YouTube thumbnail.
            Video Title: "${title}".
            Language: ${language}.
            Max 3-5 words per hook.
            Return JSON: [{ "hook": "...", "score": 90 }]
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    }, apiKey);
};

export const evaluateMetadata = async (title: string, description: string, tags: string[], apiKey?: string): Promise<any> => {
    return executeWithRotation(async (ai) => {
        const prompt = `
            Evaluate this YouTube metadata quality (0-100):
            Title: ${title}
            Desc Length: ${description.length} chars
            Tags: ${tags.join(',')}
            Output in **ARABIC**.
            Return JSON: { "score": 85, "advice": "Short advice..." }
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    }, apiKey);
};

export const generateAdvancedIdeas = async (
    niches: string, 
    count: number, 
    positivePrompt: string, 
    negativePrompt: string, 
    model: string, 
    style: string, 
    apiKey?: string
): Promise<Idea[]> => {
    return executeWithRotation(async (ai) => {
        const prompt = `
            Generate ${count} viral YouTube video ideas for niches: "${niches}".
            Focus on: ${positivePrompt}. Avoid: ${negativePrompt}.
            Title Style: ${style}.
            Output in **ARABIC**.
            Return JSON: [{ "id": "1", "title": "...", "description": "...", "score": 90, "originalLine": "..." }]
        `;
        
        // Pass selected model from UI, defaults to flash if not provided
        const response = await ai.models.generateContent({
            model: model || "gemini-2.0-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const raw = JSON.parse(cleanJson(response.text || "[]"));
        return raw.map((item: any, idx: number) => ({
            ...item,
            id: item.id || Date.now().toString() + idx,
            originalLine: `${item.title} - ${item.description}`
        }));
    }, apiKey);
};
