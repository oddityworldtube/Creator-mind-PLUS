export interface ChannelProfile {
  id: string;
  name: string;
  channelId: string;
  apiKey: string; // YouTube Data API Key
  geminiApiKey?: string; // Specific Gemini Key for this channel
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string; // Short-lived
}

export interface AppSettings {
  geminiApiKeys: string[];
  customModels: string[]; // List of user-added model names
  theme: 'light' | 'dark';
}

export interface ChannelStats {
  title: string;
  description: string;
  customUrl: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  thumbnailUrl: string;
}

export type PerformanceStatus = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' | 'NEW';

// --- NEW: Transcript/Caption Types ---
export interface VideoCaption {
    text: string;
    start: number;
    duration: number;
}

export interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  duration?: string;
  durationSeconds: number;
  tags?: string[];
  description?: string;
  categoryId?: string;
  performanceStatus?: PerformanceStatus;
  performanceRatio?: number;
  // New field for content analysis
  captions?: VideoCaption[];
}

export interface AnalysisResult {
  strategy: string;
  videoSuggestions: string;
  overallScore: number;
  // Optional expanded properties
  optimizedTitleSuggestions?: { title: string; score: number; psychology?: TitlePsychology }[];
  optimizedDescription?: string;
  scoredTags?: { tag: string; score: number }[];
  suggestedTags?: { tag: string; score: number }[];
  thumbnailPrompt?: string;
  thumbnailHooks?: { hook: string; score: number }[];
  relatedVideos?: { title: string; videoId: string; relevanceReason: string }[];
  thumbnailAnalysis?: ThumbnailAnalysis;
  contentInsights?: ContentInsights;
}

export interface SingleVideoAnalysisResult {
  verdict: string;
  reasons: string[];
  improvements: string[];
  score: number;
  titleSuggestions: { title: string; score: number; reason: string }[];
}

export interface ShortsToLongResult {
  shortTitle: string;
  longIdeas: string[];
}

// --- Advanced Idea Generator Types ---

export interface Idea {
  id: string;
  score: number;
  title: string;
  description: string;
  originalLine: string;
}

export interface NicheData {
  id: string;
  name: string;
  rating?: number;
  category: string;
}

export interface DefaultIdeaSettings {
  ideaCount: number;
  positivePrompt: string;
  negativePrompt: string;
  model: string;
  titleCaseStyle: 'sentence' | 'title' | 'allcaps';
}

export interface IdeaGeneratorSettings {
    ideaCount: number;
    positivePrompt: string;
    negativePrompt: string;
    selectedModel: string;
}

export interface IdeaSession {
    id: number | string;
    date: string;
    niches: string | string[]; 
    results?: GeneratedIdea[]; 
    ideas?: Idea[]; 
    count?: number;
    firstIdea?: string;
}

// Keeping for backward compatibility if needed, but prefer Idea
export interface GeneratedIdea {
    title: string;
    description: string;
    score: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    keywords: string[];
}

// --- Optimization Types ---

export interface ScoredTag {
  tag: string;
  score: number; // 0-100
}

// --- NEW: Psychology Analysis Types ---
export interface TitlePsychology {
    curiosityScore: number; // 0-100
    urgencyScore: number; // 0-100
    emotionType: string; // e.g. "Fear", "Joy", "Surprise"
    powerWords: string[];
    analysis: string; // Short text explanation
}

export interface ScoredTitle {
  title: string;
  score: number;
  // Enhanced analysis
  psychology?: TitlePsychology;
}

export interface ScoredHook {
    hook: string;
    score: number;
}

export interface RelatedVideoSuggestion {
  title: string;
  videoId: string;
  relevanceReason: string;
}

// --- NEW: Vision/Thumbnail Analysis Types ---
export interface ThumbnailAnalysis {
    score: number;
    critique: string[]; // List of visual issues (e.g. "Text too small", "Low contrast")
    improvements: string[]; // List of actionable fixes
    colorProfile: string; // e.g. "Dark/Gloomy", "Bright/Vibrant"
    faceDetected: boolean;
    textReadability: 'High' | 'Medium' | 'Low';
}

// --- NEW: Deep Content Insights (from Transcripts) ---
export interface ContentInsights {
    summary: string;
    keyTopics: string[];
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    pacingScore: number; // How fast/slow the speaker talks
    hookEffectiveness: number; // First 30s analysis
}

export interface OptimizationResult {
  optimizedTitleSuggestions: ScoredTitle[];
  optimizedDescription: string;
  scoredTags: ScoredTag[]; // Current tags rated
  suggestedTags: ScoredTag[]; // New suggestions
  thumbnailPrompt: string;
  thumbnailHooks: ScoredHook[];
  relatedVideos: RelatedVideoSuggestion[];
  
  // New Enhanced Fields
  thumbnailAnalysis?: ThumbnailAnalysis;
  contentInsights?: ContentInsights;
}

// --- Competitor Analysis ---

export interface CompetitorContentIdea {
    title: string;
    explanation: string;
}

export interface CompetitorAnalysisResult {
  comparisonSummary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  actionableTips: string[];
  competitorContentIdeas: CompetitorContentIdea[];
}

export interface SavedCompetitor {
    id: string; // internal id
    channelId: string; // youtube id
    title: string;
    thumbnailUrl: string;
    // New fields for caching analysis
    lastAnalysis?: CompetitorAnalysisResult;
    lastAnalysisDate?: string;
    stats?: CompetitorData; // Save basic stats too
}

export interface CompetitorData {
  id: string;
  channelId: string;
  title: string;
  customUrl: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  thumbnailUrl: string;
  recentVideoAvgViews: number;
  lastUploadDate: string;
}

// --- Canvas & Text Objects ---

export interface TextObject {
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    strokeColor: string;
    strokeWidth: number;
    shadowColor: string;
    shadowBlur: number;
    highlightWords: string[];
    highlightColor: string;
    highlightScale: number;
    lineHeight: number;
    opacity: number;
    rotation: number;
    align: 'left' | 'center' | 'right';
    isDragging: boolean;
    isLocked?: boolean;
    isHidden?: boolean;
    zIndex?: number;
}

export interface CanvasTemplate {
    id: string;
    name: string;
    previewColor: string;
    objects: Partial<TextObject>[];
    isCustom?: boolean; // New field for user templates
}

// --- Toast Types ---

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
}