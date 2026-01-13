import { NextRequest, NextResponse } from "next/server";
import { USE_SUPABASE } from "@/lib/config";
import { loadSetupConfig, clearConfigCache } from "@/lib/setup-loader";
import { promises as fs } from "fs";
import path from "path";

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

// Mock function to get video transcript
// In production, this would use YouTube's transcript API or a service like youtube-transcript
async function getVideoTranscript(videoId: string): Promise<string> {
  // For demo purposes, return mock transcript
  // In production: use youtube-transcript package or YouTube API
  return `This is a sample transcript for video ${videoId}.

This video covers important topics that will help you understand the subject better.

Key points discussed:
1. Introduction to the main concept
2. Detailed explanation of the methodology
3. Practical examples and use cases
4. Common pitfalls to avoid
5. Best practices and recommendations

Thank you for watching! Don't forget to like and subscribe for more content.`;
}

async function getLocalConfig(): Promise<{ youtube: YouTubeConfig; knowledgeItems: KnowledgeItem[] }> {
  const setup = await loadSetupConfig();
  return {
    youtube: setup?.youtube || { videos: [] },
    knowledgeItems: setup?.knowledgeItems || [],
  };
}

async function saveLocalConfig(youtube: YouTubeConfig, knowledgeItems: KnowledgeItem[]): Promise<void> {
  const configPath = path.join(process.cwd(), "src", "lib", "setup-config.json");
  const existingConfig = (await loadSetupConfig()) || {};

  const updatedConfig = {
    ...existingConfig,
    youtube,
    knowledgeItems,
  };

  await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
  clearConfigCache();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, videoId, modified_by, modified_by_initials } = body;

    if (!tenantId || !videoId) {
      return NextResponse.json(
        { error: "Tenant ID and video ID required" },
        { status: 400 }
      );
    }

    // Local mode
    if (!USE_SUPABASE || tenantId === "local") {
      const { youtube, knowledgeItems } = await getLocalConfig();

      // Find the video
      const videoIndex = (youtube.videos || []).findIndex(
        (v) => v.id === videoId || v.video_id === videoId
      );

      if (videoIndex === -1) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }

      const video = youtube.videos![videoIndex];

      // Check if already imported
      if (video.is_imported) {
        return NextResponse.json(
          { error: "Video already imported" },
          { status: 400 }
        );
      }

      // Get transcript
      const transcript = await getVideoTranscript(video.video_id);

      // Create knowledge item
      const knowledgeItem: KnowledgeItem = {
        id: `kb-yt-${Date.now()}`,
        source: "youtube",
        title: video.title,
        content: transcript,
        source_url: `https://youtube.com/watch?v=${video.video_id}`,
        category: "Video Transcript",
        playlist: video.playlist,
        date: video.published_at,
        length: transcript.length,
        modified_by: modified_by || "Admin",
        modified_by_initials: modified_by_initials || "AA",
        is_ai_processed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update video as imported
      youtube.videos![videoIndex] = {
        ...video,
        is_imported: true,
        knowledge_item_id: knowledgeItem.id,
      };

      // Add to knowledge base
      knowledgeItems.unshift(knowledgeItem);

      await saveLocalConfig(youtube, knowledgeItems);

      return NextResponse.json({
        success: true,
        knowledge_item: knowledgeItem,
      });
    }

    // Supabase mode
    const { supabase } = await import("@/lib/supabase");

    // Get the video
    const { data: video, error: videoError } = await supabase
      .from("youtube_videos")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.is_imported) {
      return NextResponse.json(
        { error: "Video already imported" },
        { status: 400 }
      );
    }

    // Get transcript
    const transcript = await getVideoTranscript(video.video_id);

    // Create knowledge item
    const { data: knowledgeItem, error: kbError } = await supabase
      .from("knowledge_items")
      .insert({
        tenant_id: tenantId,
        source: "youtube",
        title: video.title,
        content: transcript,
        source_url: `https://youtube.com/watch?v=${video.video_id}`,
        category: "Video Transcript",
        playlist: video.playlist,
        date: video.published_at,
        length: transcript.length,
        modified_by,
        modified_by_initials,
        is_ai_processed: false,
      })
      .select()
      .single();

    if (kbError) throw kbError;

    // Update video as imported
    await supabase
      .from("youtube_videos")
      .update({
        is_imported: true,
        knowledge_item_id: knowledgeItem.id,
      })
      .eq("id", videoId);

    return NextResponse.json({
      success: true,
      knowledge_item: knowledgeItem,
    });
  } catch (error) {
    console.error("YouTube import error:", error);
    return NextResponse.json(
      { error: "Failed to import video transcript" },
      { status: 500 }
    );
  }
}
