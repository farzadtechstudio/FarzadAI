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

interface YouTubeAPISearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      medium?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubeAPIVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      medium?: { url: string };
      default?: { url: string };
    };
  };
  contentDetails?: {
    duration: string;
  };
  statistics?: {
    viewCount: string;
  };
}

interface YouTubeAPIPlaylistItem {
  id: string;
  snippet: {
    title: string;
    channelId: string;
  };
}

interface YouTubeAPIPlaylistVideoItem {
  snippet: {
    playlistId: string;
    resourceId: {
      videoId: string;
    };
  };
}

// Parse ISO 8601 duration to human-readable format
function parseDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Fetch all playlists for a channel
async function fetchChannelPlaylists(
  channelId: string,
  apiKey: string
): Promise<Map<string, string>> {
  const playlistMap = new Map<string, string>(); // playlistId -> playlistTitle

  try {
    const playlistsUrl = `https://www.googleapis.com/youtube/v3/playlists?key=${apiKey}&channelId=${channelId}&part=snippet&maxResults=50`;
    const response = await fetch(playlistsUrl);

    if (!response.ok) {
      console.error("Failed to fetch playlists, continuing without playlist info");
      return playlistMap;
    }

    const data = await response.json();
    const playlists: YouTubeAPIPlaylistItem[] = data.items || [];

    for (const playlist of playlists) {
      playlistMap.set(playlist.id, playlist.snippet.title);
    }
  } catch (error) {
    console.error("Error fetching playlists:", error);
  }

  return playlistMap;
}

// Fetch video-to-playlist mapping
async function fetchVideoPlaylistMapping(
  playlistIds: string[],
  apiKey: string
): Promise<Map<string, { playlistId: string; playlistTitle: string }>> {
  const videoToPlaylist = new Map<string, { playlistId: string; playlistTitle: string }>();

  for (const playlistId of playlistIds) {
    try {
      let nextPageToken = "";

      do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${playlistId}&part=snippet&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Failed to fetch playlist items for ${playlistId}`);
          break;
        }

        const data = await response.json();
        const items: YouTubeAPIPlaylistVideoItem[] = data.items || [];

        for (const item of items) {
          const videoId = item.snippet.resourceId.videoId;
          // Only set if not already set (first playlist wins)
          if (!videoToPlaylist.has(videoId)) {
            videoToPlaylist.set(videoId, {
              playlistId: item.snippet.playlistId,
              playlistTitle: "", // Will be filled in later
            });
          }
        }

        nextPageToken = data.nextPageToken || "";
      } while (nextPageToken);
    } catch (error) {
      console.error(`Error fetching playlist items for ${playlistId}:`, error);
    }
  }

  return videoToPlaylist;
}

// Fetch videos from YouTube Data API v3
async function fetchVideosFromYouTube(
  channelId: string,
  apiKey?: string
): Promise<YouTubeVideo[]> {
  if (!apiKey) {
    throw new Error("YouTube API key is required");
  }

  try {
    // Step 1: Get all playlists for the channel
    const playlistMap = await fetchChannelPlaylists(channelId, apiKey);

    // Step 2: Get video-to-playlist mapping
    const playlistIds = Array.from(playlistMap.keys());
    const videoToPlaylist = await fetchVideoPlaylistMapping(playlistIds, apiKey);

    // Fill in playlist titles
    for (const [videoId, info] of videoToPlaylist.entries()) {
      const title = playlistMap.get(info.playlistId);
      if (title) {
        videoToPlaylist.set(videoId, { ...info, playlistTitle: title });
      }
    }

    // Step 3: Get video IDs from channel uploads
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&type=video&order=date&maxResults=50`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error("YouTube API search error:", errorData);
      throw new Error(errorData.error?.message || "Failed to fetch videos from YouTube");
    }

    const searchData = await searchResponse.json();
    const searchItems: YouTubeAPISearchItem[] = searchData.items || [];

    if (searchItems.length === 0) {
      return [];
    }

    // Step 4: Get detailed video info (duration, view count)
    const videoIds = searchItems.map((item) => item.id.videoId).join(",");
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=snippet,contentDetails,statistics`;

    const videosResponse = await fetch(videosUrl);
    if (!videosResponse.ok) {
      const errorData = await videosResponse.json();
      console.error("YouTube API videos error:", errorData);
      throw new Error(errorData.error?.message || "Failed to fetch video details");
    }

    const videosData = await videosResponse.json();
    const videoItems: YouTubeAPIVideoItem[] = videosData.items || [];

    // Step 5: Map to our format with playlist info
    const videos: YouTubeVideo[] = videoItems.map((video) => {
      const playlistInfo = videoToPlaylist.get(video.id);

      return {
        id: `yt-${video.id}`,
        video_id: video.id,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url || "",
        published_at: video.snippet.publishedAt,
        playlist: playlistInfo?.playlistTitle,
        playlist_id: playlistInfo?.playlistId,
        duration: video.contentDetails?.duration ? parseDuration(video.contentDetails.duration) : undefined,
        view_count: video.statistics?.viewCount ? parseInt(video.statistics.viewCount) : undefined,
        is_imported: false,
      };
    });

    return videos;
  } catch (error) {
    console.error("Error fetching from YouTube API:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Local mode
    if (!USE_SUPABASE || tenantId === "local") {
      const config = await getLocalYouTubeConfig();

      if (!config.channel_id) {
        return NextResponse.json(
          { error: "YouTube channel not configured" },
          { status: 400 }
        );
      }

      if (!config.api_key) {
        return NextResponse.json(
          { error: "YouTube API key not configured. Please update your channel settings." },
          { status: 400 }
        );
      }

      // Fetch new videos from YouTube
      const newVideos = await fetchVideosFromYouTube(
        config.channel_id,
        config.api_key
      );

      // Merge with existing videos, preserving import status
      const existingVideoIds = new Set(
        (config.videos || []).map((v) => v.video_id)
      );
      const mergedVideos = [
        ...newVideos.filter((v) => !existingVideoIds.has(v.video_id)),
        ...(config.videos || []),
      ];

      const updatedConfig: YouTubeConfig = {
        ...config,
        videos: mergedVideos,
        last_synced: new Date().toISOString(),
      };

      await saveLocalYouTubeConfig(updatedConfig);

      return NextResponse.json({
        success: true,
        videos_added: newVideos.filter((v) => !existingVideoIds.has(v.video_id))
          .length,
        total_videos: mergedVideos.length,
        last_synced: updatedConfig.last_synced,
      });
    }

    // Supabase mode
    const { supabase } = await import("@/lib/supabase");

    // Get YouTube settings
    const { data: settings } = await supabase
      .from("tenant_youtube_settings")
      .select("channel_id, api_key")
      .eq("tenant_id", tenantId)
      .single();

    if (!settings?.channel_id) {
      return NextResponse.json(
        { error: "YouTube channel not configured" },
        { status: 400 }
      );
    }

    if (!settings?.api_key) {
      return NextResponse.json(
        { error: "YouTube API key not configured. Please update your channel settings." },
        { status: 400 }
      );
    }

    // Fetch new videos
    const newVideos = await fetchVideosFromYouTube(
      settings.channel_id,
      settings.api_key
    );

    // Get existing video IDs
    const { data: existingVideos } = await supabase
      .from("youtube_videos")
      .select("video_id")
      .eq("tenant_id", tenantId);

    const existingVideoIds = new Set(
      (existingVideos || []).map((v) => v.video_id)
    );

    // Insert new videos
    const videosToInsert = newVideos
      .filter((v) => !existingVideoIds.has(v.video_id))
      .map((v) => ({
        tenant_id: tenantId,
        video_id: v.video_id,
        title: v.title,
        thumbnail: v.thumbnail,
        published_at: v.published_at,
        playlist: v.playlist,
        playlist_id: v.playlist_id,
        duration: v.duration,
        view_count: v.view_count,
        is_imported: false,
      }));

    if (videosToInsert.length > 0) {
      await supabase.from("youtube_videos").insert(videosToInsert);
    }

    // Update last synced
    await supabase
      .from("tenant_youtube_settings")
      .update({ last_synced: new Date().toISOString() })
      .eq("tenant_id", tenantId);

    return NextResponse.json({
      success: true,
      videos_added: videosToInsert.length,
    });
  } catch (error) {
    console.error("YouTube sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to sync YouTube videos";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
