// YouTube Transcript Service
// Fetches captions/transcripts from YouTube videos

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptResult {
  segments: TranscriptSegment[];
  fullText: string;
  language: string;
  wordCount: number;
  characterCount: number;
}

// Format seconds to MM:SS or HH:MM:SS
export function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Parse YouTube's timedtext XML format
function parseTimedTextXML(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const textRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;

  let match;
  while ((match = textRegex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    // Decode HTML entities
    const text = match[3]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim();

    if (text) {
      segments.push({ text, start, duration });
    }
  }

  return segments;
}

// Fetch available caption tracks for a video
async function getCaptionTracks(videoId: string): Promise<{ url: string; lang: string; name: string }[]> {
  try {
    // Fetch the video page to get caption track info
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch video page");
    }

    const html = await response.text();

    // Extract captions data from ytInitialPlayerResponse
    const captionsMatch = html.match(/"captions":\s*(\{[^}]+\}[^}]+\})/);
    if (!captionsMatch) {
      // Try alternative pattern
      const altMatch = html.match(/playerCaptionsTracklistRenderer.*?captionTracks":\s*(\[[^\]]+\])/);
      if (!altMatch) {
        return [];
      }
    }

    // Extract caption track URLs
    const tracks: { url: string; lang: string; name: string }[] = [];
    const trackRegex = /"baseUrl":"([^"]+)"[^}]*"languageCode":"([^"]+)"[^}]*"name":\{[^}]*"simpleText":"([^"]+)"/g;

    let match;
    while ((match = trackRegex.exec(html)) !== null) {
      tracks.push({
        url: match[1].replace(/\\u0026/g, "&"),
        lang: match[2],
        name: match[3],
      });
    }

    return tracks;
  } catch (error) {
    console.error("Error getting caption tracks:", error);
    return [];
  }
}

// Fetch transcript using youtube-transcript approach
export async function fetchYouTubeTranscript(videoId: string, lang: string = "en"): Promise<TranscriptResult | null> {
  try {
    // Try using the innertube API approach
    const response = await fetch(
      `https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20230101.00.00",
            },
          },
          params: Buffer.from(`\n\x0b${videoId}`).toString("base64"),
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      // Parse the transcript response
      const transcriptData = data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments;

      if (transcriptData) {
        const segments: TranscriptSegment[] = transcriptData.map((segment: { transcriptSegmentRenderer?: { snippet?: { runs?: { text: string }[] }; startMs?: string; endMs?: string } }) => {
          const renderer = segment.transcriptSegmentRenderer;
          return {
            text: renderer?.snippet?.runs?.[0]?.text || "",
            start: parseInt(renderer?.startMs || "0") / 1000,
            duration: (parseInt(renderer?.endMs || "0") - parseInt(renderer?.startMs || "0")) / 1000,
          };
        });

        const fullText = segments.map((s) => s.text).join(" ");

        return {
          segments,
          fullText,
          language: lang,
          wordCount: fullText.split(/\s+/).filter(Boolean).length,
          characterCount: fullText.length,
        };
      }
    }

    // Fallback: Try fetching from timedtext API
    const captionTracks = await getCaptionTracks(videoId);

    // Find preferred language or fallback to first available
    let trackUrl = captionTracks.find((t) => t.lang === lang)?.url;
    if (!trackUrl && captionTracks.length > 0) {
      trackUrl = captionTracks[0].url;
    }

    if (trackUrl) {
      const captionResponse = await fetch(trackUrl);
      if (captionResponse.ok) {
        const xml = await captionResponse.text();
        const segments = parseTimedTextXML(xml);
        const fullText = segments.map((s) => s.text).join(" ");

        return {
          segments,
          fullText,
          language: captionTracks.find((t) => t.url === trackUrl)?.lang || lang,
          wordCount: fullText.split(/\s+/).filter(Boolean).length,
          characterCount: fullText.length,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return null;
  }
}

// Alternative: Use a third-party API or service
export async function fetchTranscriptViaService(videoId: string): Promise<TranscriptResult | null> {
  // This could integrate with services like:
  // - RapidAPI YouTube Transcript API
  // - AssemblyAI (for audio transcription)
  // - Deepgram
  // For now, we'll return null and let the caller handle the fallback
  return null;
}

// Main function to get transcript with fallbacks
export async function getVideoTranscript(videoId: string, apiKey?: string): Promise<TranscriptResult | null> {
  // Try YouTube's built-in captions first
  let result = await fetchYouTubeTranscript(videoId);

  if (!result) {
    // Try third-party service
    result = await fetchTranscriptViaService(videoId);
  }

  return result;
}

// Export types
export type { TranscriptSegment, TranscriptResult };
