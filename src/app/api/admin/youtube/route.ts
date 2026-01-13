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

async function getLocalYouTubeConfig(): Promise<YouTubeConfig> {
  const setup = await loadSetupConfig();
  return setup?.youtube || { videos: [] };
}

async function saveLocalYouTubeConfig(config: YouTubeConfig): Promise<void> {
  const configPath = path.join(process.cwd(), "src", "lib", "setup-config.json");
  const existingConfig = (await loadSetupConfig()) || {};

  const updatedConfig = {
    ...existingConfig,
    youtube: config,
  };

  await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
  clearConfigCache();
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
  }

  // Local mode
  if (!USE_SUPABASE || tenantId === "local") {
    const config = await getLocalYouTubeConfig();
    return NextResponse.json({
      channel_id: config.channel_id,
      channel_name: config.channel_name,
      last_synced: config.last_synced,
      has_api_key: !!config.api_key,
      videos: config.videos || [],
    });
  }

  // Supabase mode
  try {
    const { supabase } = await import("@/lib/supabase");

    const [settingsResult, videosResult] = await Promise.all([
      supabase
        .from("tenant_youtube_settings")
        .select("channel_id, channel_name, last_synced, api_key")
        .eq("tenant_id", tenantId)
        .single(),
      supabase
        .from("videos")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("published_at", { ascending: false }),
    ]);

    return NextResponse.json({
      channel_id: settingsResult.data?.channel_id,
      channel_name: settingsResult.data?.channel_name,
      last_synced: settingsResult.data?.last_synced,
      has_api_key: !!settingsResult.data?.api_key,
      videos: videosResult.data || [],
    });
  } catch (error) {
    console.error("YouTube fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch YouTube data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, channel_id, channel_name, api_key } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Local mode
    if (!USE_SUPABASE || tenantId === "local") {
      const config = await getLocalYouTubeConfig();

      const updatedConfig: YouTubeConfig = {
        ...config,
        channel_id,
        channel_name,
        // Only update api_key if provided (allows keeping existing key)
        ...(api_key && { api_key }),
      };

      await saveLocalYouTubeConfig(updatedConfig);
      return NextResponse.json({ success: true });
    }

    // Supabase mode
    const { supabase } = await import("@/lib/supabase");

    const updateData: Record<string, string> = {
      tenant_id: tenantId,
      channel_id,
      channel_name,
    };
    // Only update api_key if provided
    if (api_key) {
      updateData.api_key = api_key;
    }

    const { error } = await supabase.from("tenant_youtube_settings").upsert(updateData);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("YouTube settings update error:", error);
    return NextResponse.json({ error: "Failed to update YouTube settings" }, { status: 500 });
  }
}
