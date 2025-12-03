import { GoogleGenerativeAI } from "@google/generative-ai";
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

// --- CONSTANTS ---
// النموذج الافتراضي للنصوص والتحليل
const DEFAULT_MODEL = "gemini-2.0-flash";

// قائمة نماذج الصور التي سيتم تجربتها بالترتيب (لضمان العمل)
const IMAGE_MODELS = [
    "imagen-3.0-generate-001", // الأحدث والأفضل
    "image-generation-001"     // احتياطي
];

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
            if (!savedSettings.startsWith('enc_')) {
                const parsed = JSON.parse(savedSettings);
                if (parsed.geminiApiKeys && parsed.geminiApiKeys.length > 0) return parsed.geminiApiKeys;
            }
        } catch (e) {}
    }
    return typeof process !== 'undefined' && process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : [];
};

let currentKeyIndex = 0;

// --- Helper: Parse Keys from String ---
const parseKeysFromString = (input: string): string[] => {
    if (!input) return [];
    const cleanInput = input.replace(/[\r\n"']/g, '').trim();
    return cleanInput.split(',').map(k => k.trim()).filter(k => k.length > 0);
};

// --- Helper to handle Key Rotation & library initialization ---
const executeWithRotation = async <T>(operation: (genAI: GoogleGenerativeAI) => Promise<T>, apiKeyOverride?: string): Promise<T> => {
    
    let keysToUse: string[] = [];

    if (apiKeyOverride && apiKeyOverride.trim().length > 0) {
        keysToUse = parseKeysFromString(apiKeyOverride);
    } 
    
    if (keysToUse.length === 0) {
        keysToUse = getGeminiKeys();
    }

    if (keysToUse.length === 0) {
        throw new Error("No Gemini API Keys found. Please add keys in Settings or Channel Profile.");
    }

    let lastError: any = null;
    
    for (const rawKey of keysToUse) {
        try {
            // تنظيف المفتاح من أي شوائب CSV
            const cleanKey = rawKey.trim().replace(/[\r\n"']/g, '');
            const genAI = new GoogleGenerativeAI(cleanKey);
            return await operation(genAI);
        } catch (error: any) {
            console.warn(`Key ending in ...${rawKey.slice(-4)} failed. Trying next...`, error);
            lastError = error;
            
            const msg = error.message?.toLowerCase() || "";
            const status = error.status || 0;

            // تجاهل الأخطاء والمحاولة بالمفتاح التالي
            if (
                status === 404 || 
                status === 400 || 
                status === 403 || 
                status === 429 || 
                msg.includes('not found') || 
                msg.includes('not supported') || 
                msg.includes('api key') ||
                msg.includes('quota')
            ) {
                 continue; 
            }
            // لأي أخطاء أخرى، نستمر في المحاولة أيضاً
            continue; 
        }
    }

    console.error("All keys failed. Last error details:", lastError);
    throw new Error(`All keys failed. Last error: ${lastError?.message || "Unknown error"}`);
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
    return executeWithRotation(async (genAI) => {
        const totalViews = videos.reduce((acc, v) => acc + Number(v.viewCount), 0);
        const avgViews = totalViews / (videos.length || 1);
        const processedVideos = videos.slice(0, 30).map(v => ({
            title: v.title,
            publishedAt: v.publishedAt,
            metrics: { views: Number(v.viewCount) }
        }));

        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `
            Analyze Channel: ${stats.title}. Avg Views: ${Math.round(avgViews)}.
            Videos: ${JSON.stringify(processedVideos)}
            **IMPORTANT**: Output the analysis strictly in **ARABIC LANGUAGE**.
            Return JSON: { "strategy": "...", "videoSuggestions": "...", "overallScore": 0-100 }
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const raw = JSON.parse(cleanJson(response.text() || "{}"));
        return raw;
    }, apiKey);
};

export const analyzeChannelNiches = async (videos: {title: string}[], apiKey?: string): Promise<string[]> => {
    return executeWithRotation(async (genAI) => {
        const videoTitles = videos.slice(0, 40).map(v => v.title).join('\n');
        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `
            Analyze these video titles from a YouTube channel:
            ${videoTitles}
            Identify the top 5 most effective "Sub-Niches".
            Focus on high-traffic, search-friendly terms in **Arabic**.
            Return ONLY a JSON array of strings.
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const raw = JSON.parse(cleanJson(response.text() || "[]"));
        return z.array(z.string()).parse(raw);
    }, apiKey);
};

export const generateTrendingNiches = async (category: string, apiKey?: string): Promise<{name: string, rating: number}[]> => {
    return executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `
            Generate 5 NEW, TRENDING YouTube sub-niches for the category: "${category}".
            Output must be in **Arabic**.
            Return JSON Array: [{ "name": "Niche Name", "rating": 95 }]
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(cleanJson(response.text() || "[]"));
    }, apiKey);
};

export const generateLongFormIdeas = async (shorts: VideoData[], apiKey?: string): Promise<ShortsToLongResult[]> => {
    return executeWithRotation(async (genAI) => {
        const shortsList = shorts.map(s => s.title);
        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `Suggest long videos from these shorts: ${JSON.stringify(shortsList)}. 
        Output JSON array {shortTitle, longIdeas[]}.
        **IMPORTANT: All ideas must be in Arabic.**`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(cleanJson(response.text() || "[]"));
    }, apiKey);
};

export const optimizeVideoMetadata = async (video: VideoData, channelVideos: VideoData[], apiKey?: string, hookLanguage: string = 'Arabic'): Promise<OptimizationResult> => {
    return executeWithRotation(async (genAI) => {
        const channelContext = channelVideos
            .filter(v => v.id !== video.id)
            .slice(0, 100)
            .map(v => ({ id: v.id, title: v.title }));

        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
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

        const result = await model.generateContent(mainPrompt);
        const response = await result.response;
        
        let visionResult = null;
        if (video.thumbnail) {
            visionResult = await analyzeThumbnailVision(video.thumbnail, video.title, apiKey);
        }

        let transcriptResult = null;
        if (video.captions && video.captions.length > 0) {
            const captionText = video.captions.map(c => c.text).join(" ");
            transcriptResult = await analyzeVideoTranscript(captionText, apiKey);
        }

        const rawMain = JSON.parse(cleanJson(response.text() || "{}"));
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
    return executeWithRotation(async (genAI) => {
        try {
            const response = await fetch(thumbnailUrl);
            const blob = await response.blob();
            const base64Data = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.readAsDataURL(blob);
            });
            
            const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
            const prompt = `
                Analyze this YouTube thumbnail for video: "${videoTitle}".
                Evaluate: Text readability, Face detection, Colors, Composition.
                Provide critique and improvements.
                Output in **ARABIC**.
                Return JSON: { "score": 80, "critique": ["text too small"], "improvements": ["make text bigger"], "colorProfile": "Vibrant", "faceDetected": true, "textReadability": "Medium" }
            `;
            
            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64Data, mimeType: blob.type } }
            ]);
            
            return JSON.parse(cleanJson(result.response.text() || "{}"));
        } catch (e) {
            console.warn("Vision analysis failed", e);
            return null;
        }
    }, apiKey);
};

export const analyzeVideoTranscript = async (captions: string, apiKey?: string): Promise<ContentInsights | null> => {
    return executeWithRotation(async (genAI) => {
        const text = captions.substring(0, 30000); 
        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `
            Analyze this video transcript.
            Determine: Sentiment, Pacing, Key Topics, Summary, Hook Effectiveness (first few lines).
            Output in **ARABIC**.
            Return JSON matching ContentInsights interface: { "summary": "...", "keyTopics": ["..."], "sentiment": "Positive", "pacingScore": 80, "hookEffectiveness": 90 }
        `;
        const result = await model.generateContent([prompt, text]);
        return JSON.parse(cleanJson(result.response.text() || "{}"));
    }, apiKey);
};

export const generateEnhancedImagePrompt = async (videoTitle: string, videoDesc: string, apiKey?: string): Promise<string> => {
    return executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `Create a detailed image generation prompt for a YouTube thumbnail based on: "${videoTitle}". Describe lighting, composition, and style. Output English prompt only.`;
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    }, apiKey);
};

export interface ImageGenOptions {
    prompt: string;
    negativePrompt?: string;
    style?: string;
}

// --- NEW: Robust Image Generation with Model Fallback ---
export const generateThumbnailImage = async (options: ImageGenOptions | string, mode: 'normal' | 'composite' = 'normal', apiKey?: string): Promise<string | null> => {
    
    // 1. Get a valid pool of keys manually
    let keysToUse: string[] = [];
    if (apiKey && apiKey.trim().length > 0) {
        keysToUse = parseKeysFromString(apiKey);
    } 
    
    if (keysToUse.length === 0) {
        keysToUse = getGeminiKeys();
    }

    if (keysToUse.length === 0) {
        console.error("No keys available for image generation");
        return null;
    }

    const promptText = typeof options === 'string' ? options : options.prompt;
    const negPrompt = typeof options === 'string' ? "" : options.negativePrompt;

    // 2. Loop through Keys AND Models
    // This double loop ensures we try every key with every model until something works
    for (const rawKey of keysToUse) {
        const cleanKey = rawKey.trim().replace(/[\r\n"']/g, '');
        
        for (const modelName of IMAGE_MODELS) {
            try {
                // Using REST API directly to bypass library limitations for Imagen
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${cleanKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        instances: [
                            { prompt: promptText + (negPrompt ? ` (Avoid: ${negPrompt})` : "") }
                        ],
                        parameters: {
                            sampleCount: 1,
                            aspectRatio: "16:9",
                            outputOptions: { mimeType: "image/jpeg" }
                        }
                    })
                });

                if (!response.ok) {
                    // Log warning but continue to next model/key
                    // console.warn(`Image gen failed with key ...${cleanKey.slice(-4)} on model ${modelName}`);
                    continue; 
                }

                const data = await response.json();
                
                // Check for valid response structure from Imagen
                if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                    return `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
                } else if (data.predictions && data.predictions[0] && data.predictions[0].mimeType && data.predictions[0].bytesBase64Encoded) {
                     return `data:${data.predictions[0].mimeType};base64,${data.predictions[0].bytesBase64Encoded}`;
                }
                
            } catch (e) {
                console.error("Image generation connection error", e);
                // Continue to next
            }
        }
    }

    console.error("All keys and models failed to generate image.");
    return null;
};

export const analyzeCompetitors = async (myStats: ChannelStats, competitor: CompetitorData, apiKey?: string): Promise<CompetitorAnalysisResult> => {
    return executeWithRotation(async (genAI) => {
         const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
         const prompt = `Compare channel ${myStats.title} with ${competitor.title}. Return JSON with strengths, weaknesses, opportunities, actionableTips, comparisonSummary, competitorContentIdeas. Output in Arabic.`;
         const result = await model.generateContent(prompt);
         return JSON.parse(cleanJson(result.response.text() || "{}"));
    }, apiKey);
};

// --- Single Task Generators ---

export const generateTitlesOnly = async (currentTitle: string, apiKey?: string): Promise<ScoredTitle[]> => {
    return executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `
            Generate 5 viral YouTube titles based on this topic: "${currentTitle}".
            Analyze the psychology (Curiosity, Urgency, Emotion).
            Output strictly in **ARABIC**.
            Return JSON: { "titles": [{ "title": "...", "score": 90, "psychology": { "curiosityScore": 85, "urgencyScore": 70, "emotionType": "Shock", "powerWords": ["word1"], "analysis": "brief reason" } }] }
        `;
        const result = await model.generateContent(prompt);
        const raw = JSON.parse(cleanJson(result.response.text() || "{}"));
        return raw.titles || [];
    }, apiKey);
};

export const generateDescriptionOnly = async (title: string, currentDesc: string, apiKey?: string): Promise<string> => {
    return executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `
            Write a high-retention, SEO-optimized YouTube description in **ARABIC** for:
            Title: ${title}
            Context/Notes: ${currentDesc}
            Include: Hook, content summary, timestamps placeholder, and call to action.
            Return plain text.
        `;
        const result = await model.generateContent(prompt);
        return result.response.text() || "";
    }, apiKey);
};

export const generateTagsOnly = async (title: string, currentTags: string[], apiKey?: string): Promise<ScoredTag[]> => {
    return executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `
            Suggest 15 high-volume search tags for YouTube video: "${title}".
            Current tags: ${currentTags.join(',')}.
            Output in **ARABIC**.
            Return JSON: [{ "tag": "...", "score": 95 }]
        `;
        const result = await model.generateContent(prompt);
        return JSON.parse(cleanJson(result.response.text() || "[]"));
    }, apiKey);
};

export const generateThumbnailHooks = async (title: string, language: string = 'Arabic', apiKey?: string): Promise<ScoredHook[]> => {
    return executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `
            Generate 10 short, punchy text overlays (hooks) for a YouTube thumbnail.
            Video Title: "${title}".
            Language: ${language}.
            Max 3-5 words per hook.
            Return JSON: [{ "hook": "...", "score": 90 }]
        `;
        const result = await model.generateContent(prompt);
        return JSON.parse(cleanJson(result.response.text() || "[]"));
    }, apiKey);
};

export const evaluateMetadata = async (title: string, description: string, tags: string[], apiKey?: string): Promise<any> => {
    return executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `
            Evaluate this YouTube metadata quality (0-100):
            Title: ${title}
            Desc Length: ${description.length} chars
            Tags: ${tags.join(',')}
            Output in **ARABIC**.
            Return JSON: { "score": 85, "advice": "Short advice..." }
        `;
        const result = await model.generateContent(prompt);
        return JSON.parse(cleanJson(result.response.text() || "{}"));
    }, apiKey);
};

export const generateAdvancedIdeas = async (
    niches: string, 
    count: number, 
    positivePrompt: string, 
    negativePrompt: string, 
    modelName: string, 
    style: string, 
    apiKey?: string
): Promise<Idea[]> => {
    return executeWithRotation(async (genAI) => {
        // Use the requested model if provided, otherwise default to 2.0
        const finalModel = modelName || DEFAULT_MODEL;
        
        const model = genAI.getGenerativeModel({ model: finalModel });
        const prompt = `
            Generate ${count} viral YouTube video ideas for niches: "${niches}".
            Focus on: ${positivePrompt}. Avoid: ${negativePrompt}.
            Title Style: ${style}.
            Output in **ARABIC**.
            Return JSON: [{ "id": "1", "title": "...", "description": "...", "score": 90, "originalLine": "..." }]
        `;
        
        const result = await model.generateContent(prompt);
        const raw = JSON.parse(cleanJson(result.response.text() || "[]"));
        return raw.map((item: any, idx: number) => ({
            ...item,
            id: item.id || Date.now().toString() + idx,
            originalLine: `${item.title} - ${item.description}`
        }));
    }, apiKey);
};
