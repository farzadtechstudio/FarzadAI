import { promises as fs } from "fs";
import path from "path";
import {
  BRAND_CONFIG,
  WELCOME_CONFIG,
  AI_CONFIG,
  TOPIC_CARDS,
  ADMIN_USERS,
} from "./config";

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptData {
  segments: TranscriptSegment[];
  fullText: string;
  language: string;
  wordCount: number;
  characterCount: number;
}

interface TopicTag {
  name: string;
  confidence: number;
  relevance: number;
}

interface SentimentTone {
  overall: string;
  confidence: number;
  emotions: string[];
  energyLevel: string;
}

interface Insight {
  text: string;
  category: "prediction" | "observation" | "recommendation" | "analysis";
  importance: number;
  timestamp?: string;
}

interface FactCheck {
  status: "verified" | "disputed" | "unverifiable" | "partially_true" | "pending";
  explanation: string;
  sources?: string[];
  checkedAt: string;
}

interface Claim {
  text: string;
  type: "prediction" | "fact" | "opinion" | "projection";
  confidence: number;
  verifiable: boolean;
  timeframe?: string;
  factCheck?: FactCheck;
}

interface SimilarVideo {
  transcriptId: string;
  title: string;
  reason: string;
  relevanceScore: number;
}

interface AIAnalysis {
  topicTags: TopicTag[];
  sentimentTone: SentimentTone;
  insights: Insight[];
  claims: Claim[];
  similarVideos: SimilarVideo[];
  // Legacy fields for backward compatibility
  topics?: string[];
  sentiment?: string[];
  keyInsights?: { text: string; type: "Analysis" | "Observation" | "Tip" }[];
}

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string;
  published_at: string;
  playlist?: string;
  playlist_id?: string;
  duration?: string;
  view_count?: number;
  is_imported: boolean;
  knowledge_item_id?: string;
  transcript?: TranscriptData;
  ai_analysis?: AIAnalysis;
}

interface YouTubeConfig {
  channel_id?: string;
  channel_name?: string;
  api_key?: string;
  last_synced?: string;
  videos?: YouTubeVideo[];
}

interface KnowledgeItem {
  id: string;
  source: "youtube" | "manual" | "document";
  title: string;
  content: string;
  source_url?: string;
  category?: string;
  playlist?: string;
  date?: string;
  length?: number;
  modified_by?: string;
  modified_by_initials?: string;
  is_ai_processed?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SetupConfig {
  brand: typeof BRAND_CONFIG;
  welcome: typeof WELCOME_CONFIG;
  ai: typeof AI_CONFIG;
  topicCards: typeof TOPIC_CARDS;
  admin: (typeof ADMIN_USERS)[0];
  setupCompleted: boolean;
  youtube?: YouTubeConfig;
  knowledgeItems?: KnowledgeItem[];
}

let cachedConfig: SetupConfig | null = null;

export async function loadSetupConfig(): Promise<SetupConfig | null> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = path.join(process.cwd(), "src", "lib", "setup-config.json");
    const configData = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configData);

    if (config.setupCompleted) {
      cachedConfig = config;
      return config;
    }
  } catch {
    // File doesn't exist or is invalid - use default config
  }

  return null;
}

export async function getBrandConfig() {
  const setup = await loadSetupConfig();
  return setup?.brand || BRAND_CONFIG;
}

export async function getWelcomeConfig() {
  const setup = await loadSetupConfig();
  return setup?.welcome || WELCOME_CONFIG;
}

export async function getAIConfig() {
  const setup = await loadSetupConfig();
  if (setup?.ai) {
    return {
      model: setup.ai.model || AI_CONFIG.model,
      max_tokens: setup.ai.max_tokens || AI_CONFIG.max_tokens,
      temperature: setup.ai.temperature || AI_CONFIG.temperature,
      system_prompt: setup.ai.system_prompt || AI_CONFIG.system_prompt,
    };
  }
  return AI_CONFIG;
}

export async function getTopicCards() {
  const setup = await loadSetupConfig();
  return setup?.topicCards || TOPIC_CARDS;
}

export async function getAdminUsers() {
  const setup = await loadSetupConfig();
  if (setup?.admin) {
    return [setup.admin];
  }
  return ADMIN_USERS;
}

export async function isSetupCompleted(): Promise<boolean> {
  const setup = await loadSetupConfig();
  return setup?.setupCompleted || false;
}

// Clear cached config (useful when config is updated)
export function clearConfigCache() {
  cachedConfig = null;
}
