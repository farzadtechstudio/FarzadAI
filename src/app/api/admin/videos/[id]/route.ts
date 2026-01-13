import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USE_SUPABASE } from "@/lib/config";
import { loadSetupConfig } from "@/lib/setup-loader";

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
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

interface Claim {
  text: string;
  type: "prediction" | "fact" | "opinion" | "projection";
  confidence: number;
  verifiable: boolean;
  timeframe?: string;
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
  // Legacy fields
  topics?: string[];
  sentiment?: string[];
  keyInsights?: { text: string; type: "Analysis" | "Observation" | "Tip" }[];
}

interface VideoData {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string;
  published_at: string;
  playlist?: string;
  playlist_id?: string;
  duration?: string;
  view_count?: number;
  channel_id?: string;
  channel_name?: string;
  is_imported: boolean;
  transcript?: {
    segments: TranscriptSegment[];
    fullText: string;
    language: string;
    wordCount: number;
    characterCount: number;
  };
  ai_analysis?: AIAnalysis;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;

    // Get tenant ID from query param, session cookie, or default to local
    let tenantId = request.nextUrl.searchParams.get("tenantId");

    if (!tenantId) {
      // Try to get from session cookie
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("session");
      if (sessionCookie?.value) {
        try {
          const session = JSON.parse(sessionCookie.value);
          tenantId = session.tenantId;
        } catch {
          // Ignore parse errors
        }
      }
    }

    tenantId = tenantId || "local";

    if (!videoId) {
      return NextResponse.json({ error: "Video ID required" }, { status: 400 });
    }

    // Normalize topic names (handle plurals, case variations, etc.)
    const normalizeTopic = (topic: string): string => {
      let normalized = topic.trim().toLowerCase();

      // Remove common suffixes for plurals
      if (normalized.endsWith('ies')) {
        normalized = normalized.slice(0, -3) + 'y'; // robotaxis -> robotaxi handled below
      } else if (normalized.endsWith('es') && !normalized.endsWith('ies')) {
        normalized = normalized.slice(0, -2);
      } else if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
        normalized = normalized.slice(0, -1);
      }

      // Common variations mapping
      const variations: Record<string, string> = {
        'robotaxi': 'robotaxi',
        'robotaxis': 'robotaxi',
        'ai': 'artificial intelligence',
        'ev': 'electric vehicle',
        'evs': 'electric vehicle',
        'fsd': 'full self-driving',
        'self driving': 'self-driving',
        'self-drive': 'self-driving',
        'autonomous vehicle': 'autonomous vehicles',
        'autonomous car': 'autonomous vehicles',
      };

      if (variations[normalized]) {
        normalized = variations[normalized];
      }

      return normalized;
    };

    // Get canonical (display) name for a normalized topic
    const getCanonicalName = (normalizedTopic: string, originalNames: string[]): string => {
      // Return the most common original name or the first one
      const counts: Record<string, number> = {};
      for (const name of originalNames) {
        counts[name] = (counts[name] || 0) + 1;
      }
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || normalizedTopic;
    };

    // Local mode
    if (!USE_SUPABASE || tenantId === "local") {
      const setup = await loadSetupConfig();
      const youtube = setup?.youtube || { videos: [] };

      // Find the video
      const video = (youtube.videos || []).find(
        (v: { id: string; video_id: string }) => v.id === videoId || v.video_id === videoId
      );

      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }

      // Calculate topic frequency across all imported videos with normalization
      const topicFrequency: Record<string, number> = {};
      const topicOriginalNames: Record<string, string[]> = {}; // normalized -> original names
      const importedVideos = (youtube.videos || []).filter((v: { is_imported: boolean }) => v.is_imported);

      for (const v of importedVideos) {
        const topics = v.ai_analysis?.topicTags || v.ai_analysis?.topics?.map((t: string) => ({ name: t })) || [];
        for (const topic of topics) {
          const originalName = typeof topic === 'string' ? topic : topic.name;
          const normalized = normalizeTopic(originalName);
          topicFrequency[normalized] = (topicFrequency[normalized] || 0) + 1;
          if (!topicOriginalNames[normalized]) {
            topicOriginalNames[normalized] = [];
          }
          topicOriginalNames[normalized].push(originalName);
        }
      }

      // Build canonical name mapping
      const topicCanonicalNames: Record<string, string> = {};
      for (const [normalized, originals] of Object.entries(topicOriginalNames)) {
        topicCanonicalNames[normalized] = getCanonicalName(normalized, originals);
      }

      // Get channel info
      const channelId = youtube.channel_id;
      const channelName = youtube.channel_name;

      // Build response
      const videoData: VideoData = {
        ...video,
        channel_id: channelId,
        channel_name: channelName,
      };

      return NextResponse.json({
        ...videoData,
        topicFrequency,
        topicCanonicalNames,
        normalizeTopic: true, // Flag to indicate normalization is available
        totalImportedVideos: importedVideos.length,
      });
    }

    // Supabase mode
    const { createServerClient } = await import("@/lib/supabase");
    const supabase = createServerClient();

    console.log("Fetching video:", { videoId, tenantId });

    // Check if videoId looks like a UUID (for database id) or YouTube video ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);

    let query = supabase
      .from("videos")
      .select("*")
      .eq("tenant_id", tenantId);

    if (isUUID) {
      // If it's a UUID, search by database id
      query = query.eq("id", videoId);
    } else {
      // Otherwise search by YouTube video_id
      query = query.eq("video_id", videoId);
    }

    const { data: video, error: videoError } = await query.single();

    if (videoError || !video) {
      console.error("Video not found:", { videoId, tenantId, isUUID, error: videoError });
      return NextResponse.json({
        error: "Video not found",
        details: videoError?.message,
        searchedFor: { videoId, tenantId, searchedBy: isUUID ? "id" : "video_id" }
      }, { status: 404 });
    }

    // Get all imported videos to calculate topic frequency
    const { data: importedVideos } = await supabase
      .from("videos")
      .select("ai_analysis")
      .eq("tenant_id", tenantId)
      .eq("is_imported", true);

    // Calculate topic frequency across all imported videos with normalization
    const topicFrequency: Record<string, number> = {};
    const topicOriginalNames: Record<string, string[]> = {};
    for (const v of importedVideos || []) {
      const topics = v.ai_analysis?.topicTags || v.ai_analysis?.topics?.map((t: string) => ({ name: t })) || [];
      for (const topic of topics) {
        const originalName = typeof topic === 'string' ? topic : topic.name;
        const normalized = normalizeTopic(originalName);
        topicFrequency[normalized] = (topicFrequency[normalized] || 0) + 1;
        if (!topicOriginalNames[normalized]) {
          topicOriginalNames[normalized] = [];
        }
        topicOriginalNames[normalized].push(originalName);
      }
    }

    // Build canonical name mapping
    const topicCanonicalNames: Record<string, string> = {};
    for (const [normalized, originals] of Object.entries(topicOriginalNames)) {
      topicCanonicalNames[normalized] = getCanonicalName(normalized, originals);
    }

    // Get channel settings
    const { data: settings } = await supabase
      .from("tenant_youtube_settings")
      .select("channel_id, channel_name")
      .eq("tenant_id", tenantId)
      .single();

    const videoData: VideoData = {
      ...video,
      channel_id: settings?.channel_id,
      channel_name: settings?.channel_name,
    };

    return NextResponse.json({
      ...videoData,
      topicFrequency,
      topicCanonicalNames,
      normalizeTopic: true,
      totalImportedVideos: (importedVideos || []).length,
    });
  } catch (error) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 500 }
    );
  }
}
