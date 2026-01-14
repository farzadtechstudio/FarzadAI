import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { YoutubeTranscript } from "youtube-transcript";
import { Innertube } from "youtubei.js";
import { Supadata } from "@supadata/js";
import { USE_SUPABASE } from "@/lib/config";
import { loadSetupConfig, clearConfigCache } from "@/lib/setup-loader";
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);
const JWT_SECRET = process.env.JWT_SECRET || "local-dev-secret-change-in-production";

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

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

interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Array<{ utf8: string; tOffsetMs?: number }>;
  aAppend?: number;
}

// Fetch transcript using Python youtube-transcript-api (most reliable method)
async function fetchTranscriptViaPython(videoId: string): Promise<TranscriptData | null> {
  try {
    console.log("Trying Python youtube-transcript-api...");
    const scriptPath = path.join(process.cwd(), "scripts", "fetch-transcript.py");

    // Try multiple Python paths
    const pythonPaths = ["python3", "python", "/usr/bin/python3", "/usr/local/bin/python3"];
    let result = null;

    for (const pythonCmd of pythonPaths) {
      try {
        const { stdout } = await execAsync(`${pythonCmd} "${scriptPath}" "${videoId}"`, {
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large transcripts
        });
        result = JSON.parse(stdout);
        break;
      } catch {
        continue;
      }
    }

    if (!result) {
      console.log("Python not found or script failed");
      return null;
    }

    if (!result.success) {
      console.log("Python transcript fetch failed:", result.error);
      return null;
    }

    console.log(`Got ${result.segments.length} segments from Python youtube-transcript-api`);

    // Merge small segments into paragraphs
    const paragraphs = mergeSegmentsIntoParagraphs(result.segments);
    console.log(`Merged into ${paragraphs.length} paragraphs`);

    return {
      segments: paragraphs,
      fullText: result.fullText,
      language: result.language || "en",
      wordCount: result.wordCount,
      characterCount: result.characterCount,
    };
  } catch (error) {
    console.log("Python transcript fetch error:", error);
    return null;
  }
}

// Store debug info about transcript fetch attempts
interface FetchAttemptDebug {
  method: string;
  success: boolean;
  error?: string;
  details?: string;
}

let lastFetchAttempts: FetchAttemptDebug[] = [];

function getLastFetchAttempts(): FetchAttemptDebug[] {
  return lastFetchAttempts;
}

// Fetch YouTube transcript using multiple methods with fallbacks
async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptData | null> {
  // Reset debug info for this fetch
  lastFetchAttempts = [];

  try {
    console.log("Fetching transcript for video:", videoId);

    // Method 1: Use Python youtube-transcript-api (most reliable) - SKIP on Vercel
    // Python is not available on Vercel serverless functions
    lastFetchAttempts.push({
      method: "Python youtube-transcript-api",
      success: false,
      error: "Skipped",
      details: "Python not available on Vercel serverless"
    });

    // Method 2: Use Supadata SDK (reliable for serverless)
    const supadataKey = process.env.SUPADATA_API_KEY;
    console.log("SUPADATA_API_KEY present:", !!supadataKey, "length:", supadataKey?.length || 0);
    if (supadataKey) {
      try {
        console.log("Trying Supadata SDK...");
        const supadata = new Supadata({ apiKey: supadataKey });
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log("Fetching transcript for URL:", youtubeUrl);

        const transcript = await supadata.youtube.transcript({ url: youtubeUrl, text: true });
        console.log("Supadata SDK response:", JSON.stringify(transcript).substring(0, 500));

        if (transcript && transcript.content) {
          // content can be string (when text: true) or TranscriptChunk[] (when text: false)
          let fullText: string;
          if (typeof transcript.content === "string") {
            fullText = transcript.content;
          } else {
            // It's an array of chunks, concatenate the text
            fullText = transcript.content.map((chunk: { text: string }) => chunk.text).join(" ");
          }

          console.log("Got transcript from Supadata SDK, length:", fullText.length);
          const segments: TranscriptSegment[] = [{
            text: fullText,
            start: 0,
            duration: 0,
          }];

          lastFetchAttempts.push({
            method: "Supadata SDK",
            success: true,
            details: `Got ${fullText.length} chars`
          });

          return {
            segments,
            fullText,
            language: transcript.lang || "en",
            wordCount: fullText.split(/\s+/).filter(Boolean).length,
            characterCount: fullText.length,
          };
        } else {
          const respStr = JSON.stringify(transcript).substring(0, 200);
          console.log("Supadata SDK returned no content:", respStr);
          lastFetchAttempts.push({
            method: "Supadata SDK",
            success: false,
            error: "No content in response",
            details: respStr
          });
        }
      } catch (supadataError) {
        const errMsg = supadataError instanceof Error ? supadataError.message : String(supadataError);
        console.log("Supadata SDK error:", supadataError);
        lastFetchAttempts.push({
          method: "Supadata SDK",
          success: false,
          error: "Exception",
          details: errMsg.substring(0, 200)
        });
      }
    } else {
      console.log("SUPADATA_API_KEY not set, skipping Supadata SDK");
      lastFetchAttempts.push({
        method: "Supadata SDK",
        success: false,
        error: "Skipped",
        details: "SUPADATA_API_KEY not configured"
      });
    }

    // Method 3: Use youtubei.js (uses YouTube's internal API)
    // Skip on Vercel - youtubei.js tries to write cache files which fails on read-only filesystem
    const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
    if (isVercel) {
      console.log("Skipping youtubei.js on Vercel (read-only filesystem)");
      lastFetchAttempts.push({
        method: "youtubei.js",
        success: false,
        error: "Skipped",
        details: "Not available on Vercel serverless (filesystem restrictions)"
      });
    } else {
      try {
        console.log("Trying youtubei.js library...");
        const youtube = await Innertube.create({
          retrieve_player: false,
          cache: undefined, // Disable caching
          generate_session_locally: true, // Don't fetch session from YouTube
        });

        const info = await youtube.getInfo(videoId);
        const transcriptInfo = await info.getTranscript();

        if (transcriptInfo?.transcript?.content?.body?.initial_segments) {
          const rawSegments = transcriptInfo.transcript.content.body.initial_segments;
          console.log(`Got ${rawSegments.length} segments from youtubei.js`);

          const segments: TranscriptSegment[] = rawSegments.map((seg: { snippet?: { text?: string }; start_ms?: string; end_ms?: string }) => ({
            text: seg.snippet?.text || "",
            start: parseInt(seg.start_ms || "0") / 1000,
            duration: (parseInt(seg.end_ms || "0") - parseInt(seg.start_ms || "0")) / 1000,
          })).filter((s: TranscriptSegment) => s.text.trim());

          if (segments.length > 0) {
            const paragraphs = mergeSegmentsIntoParagraphs(segments);
            console.log(`Merged into ${paragraphs.length} paragraphs`);

            const fullText = paragraphs.map((s) => s.text).join(" ");

            lastFetchAttempts.push({
              method: "youtubei.js",
              success: true,
              details: `Got ${segments.length} segments`
            });

            return {
              segments: paragraphs,
              fullText,
              language: "en",
              wordCount: fullText.split(/\s+/).filter(Boolean).length,
              characterCount: fullText.length,
            };
          } else {
            lastFetchAttempts.push({
              method: "youtubei.js",
              success: false,
              error: "No segments",
              details: "Transcript found but no valid segments"
            });
          }
        } else {
          lastFetchAttempts.push({
            method: "youtubei.js",
            success: false,
            error: "No transcript data",
            details: "transcriptInfo structure missing"
          });
        }
      } catch (innertubeError) {
        const errMsg = innertubeError instanceof Error ? innertubeError.message : String(innertubeError);
        console.log("youtubei.js library failed:", innertubeError);
        lastFetchAttempts.push({
          method: "youtubei.js",
          success: false,
          error: "Exception",
          details: errMsg.substring(0, 200)
        });
      }
    }

    // Method 4: Use youtube-transcript library
    try {
      console.log("Trying youtube-transcript library...");
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

      if (transcriptItems && transcriptItems.length > 0) {
        console.log(`Got ${transcriptItems.length} segments from youtube-transcript library`);

        const segments: TranscriptSegment[] = transcriptItems.map((item) => ({
          text: item.text,
          start: item.offset / 1000,
          duration: item.duration / 1000,
        }));

        const paragraphs = mergeSegmentsIntoParagraphs(segments);
        console.log(`Merged into ${paragraphs.length} paragraphs`);

        const fullText = paragraphs.map((s) => s.text).join(" ");

        lastFetchAttempts.push({
          method: "youtube-transcript",
          success: true,
          details: `Got ${transcriptItems.length} segments`
        });

        return {
          segments: paragraphs,
          fullText,
          language: "en",
          wordCount: fullText.split(/\s+/).filter(Boolean).length,
          characterCount: fullText.length,
        };
      } else {
        lastFetchAttempts.push({
          method: "youtube-transcript",
          success: false,
          error: "Empty result",
          details: "Library returned 0 segments"
        });
      }
    } catch (libError) {
      const errMsg = libError instanceof Error ? libError.message : String(libError);
      console.log("youtube-transcript library failed:", libError);
      lastFetchAttempts.push({
        method: "youtube-transcript",
        success: false,
        error: "Exception",
        details: errMsg.substring(0, 200)
      });
    }

    // Method 5: Try web scraping as fallback
    console.log("Falling back to web scraping...");
    const scrapedTranscript = await fetchTranscriptViaScraping(videoId);
    if (scrapedTranscript) {
      lastFetchAttempts.push({
        method: "Web scraping",
        success: true,
        details: `Got ${scrapedTranscript.segments.length} segments`
      });
      return scrapedTranscript;
    } else {
      lastFetchAttempts.push({
        method: "Web scraping",
        success: false,
        error: "Failed",
        details: "Could not scrape captions from YouTube page"
      });
    }

    // Method 6: Try yt-dlp (only works locally) - SKIP on Vercel
    lastFetchAttempts.push({
      method: "yt-dlp",
      success: false,
      error: "Skipped",
      details: "yt-dlp not available on Vercel serverless"
    });

    console.log("All transcript fetch methods failed");
    return null;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching transcript:", error);
    lastFetchAttempts.push({
      method: "Overall",
      success: false,
      error: "Top-level exception",
      details: errMsg.substring(0, 200)
    });
    return null;
  }
}

// Fetch transcript using yt-dlp (local development only)
async function fetchTranscriptViaYtdlp(videoId: string): Promise<TranscriptData | null> {
  try {
    const tmpDir = os.tmpdir();
    const outputPath = path.join(tmpDir, `yt_transcript_${videoId}`);
    const subtitlePath = `${outputPath}.en.json3`;

    // Try to find yt-dlp in common locations
    const ytdlpPaths = [
      "yt-dlp",
      "/usr/local/bin/yt-dlp",
      "/opt/homebrew/bin/yt-dlp",
      `${os.homedir()}/Library/Python/3.9/bin/yt-dlp`,
      `${os.homedir()}/.local/bin/yt-dlp`,
    ];

    let ytdlpCmd = "";
    for (const p of ytdlpPaths) {
      try {
        await execAsync(`${p} --version`);
        ytdlpCmd = p;
        break;
      } catch {
        continue;
      }
    }

    if (!ytdlpCmd) {
      console.log("yt-dlp not found");
      return null;
    }

    // Download auto-generated subtitles
    const cmd = `${ytdlpCmd} --write-auto-sub --sub-lang en --skip-download --sub-format json3 -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}" 2>&1`;

    try {
      await execAsync(cmd, { timeout: 60000 });
    } catch (execError) {
      console.log("yt-dlp command failed:", execError);
      return null;
    }

    // Read and parse the subtitle file
    let subtitleContent: string;
    try {
      subtitleContent = await fs.readFile(subtitlePath, "utf8");
    } catch {
      const altPath = path.join(tmpDir, `yt_transcript_${videoId}.en.json3`);
      try {
        subtitleContent = await fs.readFile(altPath, "utf8");
      } catch {
        return null;
      }
    }

    const json3Data = JSON.parse(subtitleContent);
    const events: Json3Event[] = json3Data.events || [];

    const segments: TranscriptSegment[] = [];
    let currentText = "";
    let currentStart = 0;

    for (const event of events) {
      if (event.segs && !event.aAppend) {
        if (currentText.trim()) {
          segments.push({
            text: currentText.trim(),
            start: currentStart / 1000,
            duration: (event.tStartMs || 0 - currentStart) / 1000,
          });
        }
        currentStart = event.tStartMs || 0;
        currentText = event.segs.map((s) => s.utf8).join("");
      } else if (event.segs && event.aAppend) {
        currentText += event.segs.map((s) => s.utf8).join("");
      }
    }

    if (currentText.trim()) {
      segments.push({
        text: currentText.trim(),
        start: currentStart / 1000,
        duration: 5,
      });
    }

    try {
      await fs.unlink(subtitlePath);
    } catch {
      // Ignore
    }

    if (segments.length === 0) {
      return null;
    }

    const paragraphs = mergeSegmentsIntoParagraphs(segments);
    const fullText = paragraphs.map((s) => s.text).join(" ");

    return {
      segments: paragraphs,
      fullText,
      language: "en",
      wordCount: fullText.split(/\s+/).filter(Boolean).length,
      characterCount: fullText.length,
    };
  } catch (error) {
    console.error("yt-dlp fetch failed:", error);
    return null;
  }
}

// Merge small segments into logical paragraphs based on pauses and sentence structure
function mergeSegmentsIntoParagraphs(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (segments.length === 0) return [];

  const paragraphs: TranscriptSegment[] = [];
  let currentParagraph: TranscriptSegment = {
    text: segments[0].text,
    start: segments[0].start,
    duration: segments[0].duration,
  };

  // Thresholds for paragraph breaks
  const PAUSE_THRESHOLD = 1.5; // seconds - a pause longer than this suggests a new thought
  const MIN_PARAGRAPH_WORDS = 30; // minimum words before considering a break
  const MAX_PARAGRAPH_WORDS = 150; // force a break if paragraph gets too long
  const SENTENCE_ENDINGS = /[.!?]\s*$/;

  for (let i = 1; i < segments.length; i++) {
    const prevSegment = segments[i - 1];
    const currentSegment = segments[i];

    // Calculate gap between segments
    const prevEnd = prevSegment.start + prevSegment.duration;
    const gap = currentSegment.start - prevEnd;

    // Count words in current paragraph
    const currentWordCount = currentParagraph.text.split(/\s+/).filter(Boolean).length;

    // Determine if we should start a new paragraph
    let shouldBreak = false;

    // Check for significant pause (indicates topic change or new thought)
    if (gap > PAUSE_THRESHOLD && currentWordCount >= MIN_PARAGRAPH_WORDS) {
      shouldBreak = true;
    }

    // Check if previous text ends with sentence-ending punctuation and we have enough content
    if (SENTENCE_ENDINGS.test(currentParagraph.text) && currentWordCount >= MIN_PARAGRAPH_WORDS) {
      // Additional heuristics for paragraph break:
      // - Longer pause (even if not above threshold)
      // - Paragraph is getting long
      if (gap > 0.8 || currentWordCount >= 80) {
        shouldBreak = true;
      }
    }

    // Force break if paragraph is too long
    if (currentWordCount >= MAX_PARAGRAPH_WORDS) {
      // Try to break at the last sentence ending
      const lastSentenceEnd = currentParagraph.text.search(/[.!?][^.!?]*$/);
      if (lastSentenceEnd > currentParagraph.text.length * 0.5) {
        // Break at sentence if it's past halfway
        shouldBreak = true;
      } else if (currentWordCount >= MAX_PARAGRAPH_WORDS + 30) {
        // Force break if really too long
        shouldBreak = true;
      }
    }

    if (shouldBreak) {
      // Clean up the paragraph text
      currentParagraph.text = currentParagraph.text.trim();
      currentParagraph.duration = prevEnd - currentParagraph.start;
      paragraphs.push(currentParagraph);

      // Start new paragraph
      currentParagraph = {
        text: currentSegment.text,
        start: currentSegment.start,
        duration: currentSegment.duration,
      };
    } else {
      // Append to current paragraph
      // Add space if needed
      if (!currentParagraph.text.endsWith(" ") && !currentSegment.text.startsWith(" ")) {
        currentParagraph.text += " ";
      }
      currentParagraph.text += currentSegment.text;
    }
  }

  // Add the final paragraph
  if (currentParagraph.text.trim()) {
    currentParagraph.text = currentParagraph.text.trim();
    const lastSegment = segments[segments.length - 1];
    currentParagraph.duration = (lastSegment.start + lastSegment.duration) - currentParagraph.start;
    paragraphs.push(currentParagraph);
  }

  return paragraphs;
}

// Fallback: fetch transcript via web scraping
async function fetchTranscriptViaScraping(videoId: string): Promise<TranscriptData | null> {
  try {
    console.log("Trying web scraping fallback for:", videoId);

    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.log("Failed to fetch video page");
      return null;
    }

    const html = await response.text();

    // Extract captions data - remove newlines first since /s flag not supported in target
    const htmlNoNewlines = html.replace(/\n/g, " ");
    const match = htmlNoNewlines.match(
      /"captions":(\{.*?"playerCaptionsTracklistRenderer":.*?\})\s*,\s*"videoDetails"/
    );
    if (!match) {
      console.log("No captions found in page");
      return null;
    }

    const captionsData = JSON.parse(match[1]);
    const tracks = captionsData.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      console.log("No caption tracks available");
      return null;
    }

    // Fetch captions in json3 format
    let captionUrl = tracks[0].baseUrl + "&fmt=json3";
    const captionRes = await fetch(captionUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const captionText = await captionRes.text();
    if (!captionText) {
      return null;
    }

    const json3Data = JSON.parse(captionText);
    const events: Json3Event[] = json3Data.events || [];

    const segments: TranscriptSegment[] = [];
    for (const event of events) {
      if (event.segs && event.tStartMs !== undefined) {
        const text = event.segs.map((s) => s.utf8).join("").trim();
        if (text && !event.aAppend) {
          segments.push({
            text,
            start: event.tStartMs / 1000,
            duration: (event.dDurationMs || 3000) / 1000,
          });
        }
      }
    }

    if (segments.length === 0) {
      return null;
    }

    console.log(`Parsed ${segments.length} raw transcript segments via scraping`);

    // Merge small segments into logical paragraphs
    const paragraphs = mergeSegmentsIntoParagraphs(segments);
    console.log(`Merged into ${paragraphs.length} paragraphs`);

    const fullText = paragraphs.map((s) => s.text).join(" ");

    return {
      segments: paragraphs,
      fullText,
      language: "en",
      wordCount: fullText.split(/\s+/).filter(Boolean).length,
      characterCount: fullText.length,
    };
  } catch (error) {
    console.error("Web scraping fallback failed:", error);
    return null;
  }
}

// Generate AI analysis using Claude Opus 4.5
async function generateAIAnalysis(
  transcript: TranscriptData,
  title: string,
  existingVideos: Array<{ id: string; video_id: string; title: string; is_imported: boolean }>
): Promise<AIAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log("No Anthropic API key found, using basic analysis");
    return generateBasicAnalysisFallback(transcript, title);
  }

  // Build the existing videos list for similar videos matching
  const existingVideosList = existingVideos
    .filter((v) => v.is_imported)
    .map((v) => `- ID: ${v.video_id} | Title: "${v.title}"`)
    .join("\n");

  const prompt = `Analyze this video transcript and extract structured data. Return ONLY valid JSON with the following structure:

{
  "topicTags": [
    {"name": "Topic Name", "confidence": 0.95, "relevance": 0.9}
  ],
  "sentimentTone": {
    "overall": "informative",
    "confidence": 0.85,
    "emotions": ["curious", "enthusiastic"],
    "energyLevel": "high"
  },
  "insights": [
    {
      "text": "Key insight from the transcript",
      "category": "prediction|observation|recommendation|analysis",
      "importance": 0.9,
      "timestamp": "optional timestamp reference"
    }
  ],
  "claims": [
    {
      "text": "A specific claim made",
      "type": "prediction|fact|opinion|projection",
      "confidence": 0.8,
      "verifiable": true,
      "timeframe": "optional timeframe for predictions"
    }
  ],
  "similarVideos": [
    {
      "transcriptId": "the-video-id-from-the-list",
      "title": "Exact title from the list",
      "reason": "Why it's similar to the current video",
      "relevanceScore": 0.85
    }
  ]
}

Guidelines:
- topicTags: Extract 5-10 key topics with confidence (0-1) and relevance (0-1) scores
- sentimentTone: Identify overall tone (informative, critical, enthusiastic, analytical, conversational, etc.)
- insights: Extract up to 5 most important insights, categorized by type
- claims: Identify claims, especially predictions about technology, business, or society
- similarVideos: IMPORTANT - Select 3-5 videos from the "EXISTING VIDEOS IN FARZAD'S FEED" list below that are most related to this transcript. Include the exact transcriptId (video_id) and title from that list. If no existing videos list is provided or empty, return an empty array.

TRANSCRIPT TITLE: ${title}

TRANSCRIPT CONTENT:
${transcript.fullText.slice(0, 15000)}

EXISTING VIDEOS IN FARZAD'S FEED (use ONLY these for similarVideos):
${existingVideosList || "(No existing imported videos yet)"}

Return ONLY the JSON object, no additional text.`;

  try {
    console.log("Calling Claude Opus 4.5 for AI analysis...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return generateBasicAnalysisFallback(transcript, title);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      console.error("No content in Claude response");
      return generateBasicAnalysisFallback(transcript, title);
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from response");
      return generateBasicAnalysisFallback(transcript, title);
    }

    const analysis = JSON.parse(jsonMatch[0]) as AIAnalysis;

    // Add legacy fields for backward compatibility
    analysis.topics = analysis.topicTags?.map((t) => t.name) || [];
    analysis.sentiment = [
      analysis.sentimentTone?.overall || "Informative",
      ...(analysis.sentimentTone?.emotions || []),
      `Energy: ${analysis.sentimentTone?.energyLevel || "moderate"}`,
    ];
    analysis.keyInsights = analysis.insights?.map((i) => ({
      text: i.text,
      type: (i.category === "analysis"
        ? "Analysis"
        : i.category === "observation"
          ? "Observation"
          : "Tip") as "Analysis" | "Observation" | "Tip",
    }));

    console.log("AI analysis completed successfully");
    return analysis;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return generateBasicAnalysisFallback(transcript, title);
  }
}

// Fallback basic analysis when Claude API is unavailable
function generateBasicAnalysisFallback(transcript: TranscriptData, title: string): AIAnalysis {
  const text = (transcript.fullText + " " + title).toLowerCase();

  // Extract potential topics from common words
  const topicKeywords: { [key: string]: string } = {
    invest: "Investing",
    stock: "Stocks",
    money: "Finance",
    business: "Business",
    tech: "Technology",
    ai: "Artificial Intelligence",
    crypto: "Cryptocurrency",
    bitcoin: "Bitcoin",
    "real estate": "Real Estate",
    market: "Markets",
    economy: "Economy",
    wealth: "Wealth Building",
    entrepreneur: "Entrepreneurship",
    startup: "Startups",
    innovation: "Innovation",
    future: "Future Predictions",
    risk: "Risk Management",
    optimis: "Optimism",
    pessimis: "Pessimism",
    tesla: "Tesla",
    cybercab: "Cybercab",
    robotaxi: "Robotaxi",
    autonomy: "Autonomous Vehicles",
  };

  const topicTags: TopicTag[] = [];
  for (const [keyword, topic] of Object.entries(topicKeywords)) {
    if (text.includes(keyword)) {
      topicTags.push({
        name: topic,
        confidence: 0.7,
        relevance: 0.8,
      });
    }
  }

  // Limit to 10 topics
  const finalTopics = topicTags.slice(0, 10);

  // Determine sentiment
  const emotions: string[] = [];
  if (text.includes("excited") || text.includes("amazing") || text.includes("great")) {
    emotions.push("enthusiastic");
  }
  if (text.includes("?") || text.includes("how") || text.includes("why")) {
    emotions.push("curious");
  }
  if (text.includes("important") || text.includes("must") || text.includes("need to know")) {
    emotions.push("informative");
  }

  const energyLevel = text.includes("!") || transcript.segments.length > 30 ? "high" : "moderate";

  // Generate insights from sentences
  const sentences = transcript.fullText.split(/[.!?]+/).filter((s) => s.trim().length > 30);
  const insights: Insight[] = sentences.slice(0, 5).map((s, i) => ({
    text: s.trim().substring(0, 200),
    category: i === 0 ? "analysis" : "observation",
    importance: 0.8 - i * 0.1,
  }));

  return {
    topicTags: finalTopics.length > 0 ? finalTopics : [{ name: "General", confidence: 0.5, relevance: 0.5 }],
    sentimentTone: {
      overall: emotions.includes("enthusiastic") ? "enthusiastic" : "informative",
      confidence: 0.7,
      emotions: emotions.length > 0 ? emotions : ["informative"],
      energyLevel,
    },
    insights,
    claims: [],
    similarVideos: [],
    // Legacy fields
    topics: finalTopics.map((t) => t.name),
    sentiment: [emotions[0] || "Informative", `Energy: ${energyLevel}`],
    keyInsights: insights.map((i) => ({
      text: i.text,
      type: "Analysis" as const,
    })),
  };
}

// Fact-check claims using Grok (xAI)
async function factCheckClaimsWithGrok(claims: Claim[]): Promise<Claim[]> {
  const xaiApiKey = process.env.XAI_API_KEY;

  if (!xaiApiKey) {
    console.log("No xAI API key found, skipping fact-checking");
    return claims;
  }

  // Only fact-check verifiable claims (facts and projections)
  const verifiableClaims = claims.filter(
    (c) => c.verifiable && (c.type === "fact" || c.type === "projection")
  );

  if (verifiableClaims.length === 0) {
    console.log("No verifiable claims to fact-check");
    return claims;
  }

  console.log(`Fact-checking ${verifiableClaims.length} claims with Grok...`);

  const factCheckedClaims = await Promise.all(
    claims.map(async (claim) => {
      // Skip non-verifiable claims or predictions/opinions
      if (!claim.verifiable || (claim.type !== "fact" && claim.type !== "projection")) {
        return {
          ...claim,
          factCheck: {
            status: "unverifiable" as const,
            explanation: claim.type === "prediction"
              ? "Predictions cannot be fact-checked until the predicted timeframe passes."
              : claim.type === "opinion"
                ? "Opinions are subjective and cannot be objectively verified."
                : "This claim cannot be independently verified.",
            checkedAt: new Date().toISOString(),
          },
        };
      }

      try {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${xaiApiKey}`,
          },
          body: JSON.stringify({
            model: "grok-3-latest",
            messages: [
              {
                role: "system",
                content: `You are a fact-checker. Analyze the following claim and determine its accuracy. Respond with ONLY a JSON object in this exact format:
{
  "status": "verified" | "disputed" | "partially_true" | "unverifiable",
  "explanation": "Brief explanation of your finding (1-2 sentences)",
  "sources": ["optional array of source references if available"]
}

Status meanings:
- "verified": The claim is factually accurate based on available evidence
- "disputed": The claim contradicts available evidence or expert consensus
- "partially_true": The claim has some truth but is misleading or incomplete
- "unverifiable": Cannot be confirmed or denied with available information`,
              },
              {
                role: "user",
                content: `Fact-check this claim: "${claim.text}"`,
              },
            ],
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Grok API error:", response.status, errorText);
          return {
            ...claim,
            factCheck: {
              status: "pending" as const,
              explanation: "Fact-check could not be completed at this time.",
              checkedAt: new Date().toISOString(),
            },
          };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          return {
            ...claim,
            factCheck: {
              status: "pending" as const,
              explanation: "No response from fact-checker.",
              checkedAt: new Date().toISOString(),
            },
          };
        }

        // Parse the JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return {
            ...claim,
            factCheck: {
              status: "pending" as const,
              explanation: content.slice(0, 200),
              checkedAt: new Date().toISOString(),
            },
          };
        }

        const factCheckResult = JSON.parse(jsonMatch[0]);
        return {
          ...claim,
          factCheck: {
            status: factCheckResult.status || "pending",
            explanation: factCheckResult.explanation || "No explanation provided.",
            sources: factCheckResult.sources,
            checkedAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        console.error("Error fact-checking claim:", error);
        return {
          ...claim,
          factCheck: {
            status: "pending" as const,
            explanation: "Error occurred during fact-checking.",
            checkedAt: new Date().toISOString(),
          },
        };
      }
    })
  );

  console.log("Fact-checking completed");
  return factCheckedClaims;
}

async function getLocalConfig(): Promise<{ youtube: YouTubeConfig; knowledgeItems: KnowledgeItem[] }> {
  const setup = await loadSetupConfig();
  return {
    youtube: setup?.youtube || { videos: [] },
    knowledgeItems: setup?.knowledgeItems || [],
  };
}

async function saveLocalConfig(youtube: YouTubeConfig, knowledgeItems: KnowledgeItem[]): Promise<void> {
  // Note: This function only works in local development, not on Vercel (read-only filesystem)
  try {
    const configPath = path.join(process.cwd(), "src", "lib", "setup-config.json");
    const existingConfig = (await loadSetupConfig()) || {};

    const updatedConfig = {
      ...existingConfig,
      youtube,
      knowledgeItems,
    };

    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
    clearConfigCache();
  } catch (error) {
    // On Vercel, filesystem is read-only - this is expected to fail
    console.error("Failed to save local config (expected on Vercel):", error);
    throw new Error("Cannot save to filesystem - use Supabase mode on Vercel");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { tenantId, videoId, modified_by, modified_by_initials, forceReimport } = body;

    console.log("=== IMPORT DEBUG START ===");
    console.log("Body received:", JSON.stringify({ tenantId, videoId, forceReimport }));
    console.log("JWT_SECRET configured:", !!JWT_SECRET, "length:", JWT_SECRET?.length || 0);
    console.log("USE_SUPABASE:", USE_SUPABASE);

    // If tenantId not provided, try to get from auth_token JWT cookie
    if (!tenantId) {
      console.log("No tenantId in body, checking JWT cookie...");
      const cookieStore = await cookies();
      const authToken = cookieStore.get("auth_token");
      console.log("auth_token cookie present:", !!authToken?.value, "length:", authToken?.value?.length || 0);

      if (authToken?.value) {
        try {
          const decoded = jwt.verify(authToken.value, JWT_SECRET) as JWTPayload;
          tenantId = decoded.tenantId;
          console.log("JWT decoded successfully - tenantId:", tenantId, "userId:", decoded.userId, "email:", decoded.email);
        } catch (err) {
          console.error("JWT verification failed:", err);
          // Try decoding without verification to see what's in the token
          try {
            const parts = authToken.value.split(".");
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
              console.log("JWT payload (unverified):", JSON.stringify(payload));
            }
          } catch {
            console.log("Could not decode JWT payload");
          }
        }
      } else {
        console.log("No auth_token cookie found");
      }
    }

    // On Vercel, always use Supabase mode (filesystem is read-only)
    const isVercelEnv = process.env.VERCEL === "1" || process.env.VERCEL === "true";
    const shouldUseSupabase = USE_SUPABASE || isVercelEnv;

    console.log("Final values - tenantId:", tenantId, "videoId:", videoId, "forceReimport:", forceReimport);
    console.log("USE_SUPABASE:", USE_SUPABASE, "isVercel:", isVercelEnv, "shouldUseSupabase:", shouldUseSupabase);
    console.log("=== IMPORT DEBUG END ===");

    if (!tenantId || !videoId) {
      return NextResponse.json(
        {
          error: "Tenant ID and video ID required",
          debug: {
            tenantId,
            videoId,
            jwtSecretConfigured: !!JWT_SECRET,
            useSupabase: shouldUseSupabase,
            isVercel: isVercelEnv
          }
        },
        { status: 400 }
      );
    }

    // Local mode - only for local development, never on Vercel
    if (!shouldUseSupabase && tenantId === "local") {
      const { youtube, knowledgeItems } = await getLocalConfig();

      // Find the video
      const videoIndex = (youtube.videos || []).findIndex(
        (v) => v.id === videoId || v.video_id === videoId
      );

      if (videoIndex === -1) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }

      const video = youtube.videos![videoIndex];

      // Check if already imported (unless force re-import)
      if (video.is_imported && !forceReimport) {
        return NextResponse.json(
          { error: "Video already imported" },
          { status: 400 }
        );
      }

      // Fetch real transcript - NO MOCK FALLBACK
      const transcript = await fetchYouTubeTranscript(video.video_id);
      if (!transcript) {
        console.error("All transcript fetch methods failed for video:", video.video_id);
        const attempts = getLastFetchAttempts();
        return NextResponse.json({
          error: "Could not fetch transcript for this video",
          details: "All transcript fetch methods failed. See 'attempts' for details.",
          videoId: video.video_id,
          attempts: attempts,
          envCheck: {
            SUPADATA_API_KEY: !!process.env.SUPADATA_API_KEY,
            SUPADATA_KEY_LENGTH: process.env.SUPADATA_API_KEY?.length || 0,
          }
        }, { status: 422 });
      }

      // Generate AI analysis using Claude Opus 4.5
      const existingVideos = (youtube.videos || []).map((v) => ({
        id: v.id,
        video_id: v.video_id,
        title: v.title,
        is_imported: v.is_imported,
      }));
      const aiAnalysis = await generateAIAnalysis(transcript, video.title, existingVideos);

      // Fact-check claims using Grok
      if (aiAnalysis.claims && aiAnalysis.claims.length > 0) {
        aiAnalysis.claims = await factCheckClaimsWithGrok(aiAnalysis.claims);
      }

      // Create knowledge item
      const knowledgeItem: KnowledgeItem = {
        id: `kb-yt-${Date.now()}`,
        source: "youtube",
        title: video.title,
        content: transcript.fullText,
        source_url: `https://youtube.com/watch?v=${video.video_id}`,
        category: "Video Transcript",
        playlist: video.playlist,
        date: video.published_at,
        length: transcript.characterCount,
        modified_by: modified_by || "Admin",
        modified_by_initials: modified_by_initials || "AA",
        is_ai_processed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update video as imported with transcript and AI analysis
      youtube.videos![videoIndex] = {
        ...video,
        is_imported: true,
        knowledge_item_id: knowledgeItem.id,
        transcript,
        ai_analysis: aiAnalysis,
      };

      // Add to knowledge base
      knowledgeItems.unshift(knowledgeItem);

      await saveLocalConfig(youtube, knowledgeItems);

      return NextResponse.json({
        success: true,
        knowledge_item: knowledgeItem,
        video_id: video.id,
      });
    }

    // Supabase mode
    const { createServerClient } = await import("@/lib/supabase");
    const supabase = createServerClient();

    console.log("Import request - tenantId:", tenantId, "videoId:", videoId);

    // Check if videoId looks like a UUID (for database id) or YouTube video ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);

    let query = supabase
      .from("videos")
      .select("*")
      .eq("tenant_id", tenantId);

    if (isUUID) {
      query = query.eq("id", videoId);
    } else {
      query = query.eq("video_id", videoId);
    }

    const { data: video, error: videoError } = await query.single();

    if (videoError || !video) {
      console.error("Video not found error:", videoError, "videoId:", videoId, "tenantId:", tenantId, "searchedBy:", isUUID ? "id" : "video_id");
      return NextResponse.json({ error: "Video not found", details: videoError?.message, searchedBy: isUUID ? "id" : "video_id" }, { status: 404 });
    }

    console.log("Found video:", video.id, "video_id:", video.video_id, "title:", video.title, "is_imported:", video.is_imported, "forceReimport:", forceReimport);

    // Check if already imported (unless force re-import)
    if (video.is_imported && !forceReimport) {
      return NextResponse.json(
        { error: "Video already imported" },
        { status: 400 }
      );
    }

    // Fetch real transcript - NO MOCK FALLBACK
    console.log("Fetching transcript for video_id:", video.video_id);
    const transcript = await fetchYouTubeTranscript(video.video_id);
    if (!transcript) {
      console.error("All transcript fetch methods failed for video:", video.video_id);
      const attempts = getLastFetchAttempts();
      console.log("Fetch attempts debug:", JSON.stringify(attempts));
      return NextResponse.json({
        error: "Could not fetch transcript for this video",
        details: "All transcript fetch methods failed. See 'attempts' for details.",
        videoId: video.video_id,
        attempts: attempts,
        envCheck: {
          SUPADATA_API_KEY: !!process.env.SUPADATA_API_KEY,
          SUPADATA_KEY_LENGTH: process.env.SUPADATA_API_KEY?.length || 0,
        }
      }, { status: 422 });
    }
    console.log("Transcript obtained, wordCount:", transcript.wordCount);

    // Get existing videos for similar videos matching
    const { data: existingVideosData } = await supabase
      .from("videos")
      .select("id, video_id, title, is_imported")
      .eq("tenant_id", tenantId);

    const existingVideos = (existingVideosData || []).map((v: { id: string; video_id: string; title: string; is_imported: boolean }) => ({
      id: v.id,
      video_id: v.video_id,
      title: v.title,
      is_imported: v.is_imported,
    }));

    // Generate AI analysis using Claude Opus 4.5
    const aiAnalysis = await generateAIAnalysis(transcript, video.title, existingVideos);

    // Fact-check claims using Grok
    if (aiAnalysis.claims && aiAnalysis.claims.length > 0) {
      aiAnalysis.claims = await factCheckClaimsWithGrok(aiAnalysis.claims);
    }

    // Create knowledge item (only include columns that exist in schema)
    const { data: knowledgeItem, error: kbError } = await supabase
      .from("knowledge_items")
      .insert({
        tenant_id: tenantId,
        source: "youtube",
        title: video.title,
        content: transcript.fullText,
        source_url: `https://youtube.com/watch?v=${video.video_id}`,
      })
      .select()
      .single();

    if (kbError) {
      console.error("Failed to create knowledge item:", kbError);
      throw kbError;
    }
    console.log("Knowledge item created:", knowledgeItem.id);

    // Update video as imported with transcript and AI analysis
    // Use video.id (the database UUID) not videoId (which might be the YouTube video_id)
    console.log("Updating video with transcript and AI analysis, video.id:", video.id);
    const { error: updateError, data: updateData } = await supabase
      .from("videos")
      .update({
        is_imported: true,
        transcript: transcript,
        ai_analysis: aiAnalysis,
      })
      .eq("id", video.id)
      .select();

    if (updateError) {
      console.error("Failed to update video:", updateError);
      throw updateError;
    }

    const rowsAffected = updateData?.length || 0;
    console.log("Video updated successfully, rows affected:", rowsAffected);

    // CRITICAL: If no rows were affected, the update failed silently
    if (rowsAffected === 0) {
      console.error("Update affected 0 rows - transcript not saved!");
      return NextResponse.json({
        error: "Failed to save transcript - database update affected 0 rows",
        details: "The video exists but could not be updated. Check if transcript/ai_analysis columns exist in the videos table.",
      }, { status: 500 });
    }

    // Verify the update by fetching the video again
    const { data: verifyVideo } = await supabase
      .from("videos")
      .select("transcript, ai_analysis, is_imported")
      .eq("id", video.id)
      .single();

    if (!verifyVideo?.transcript) {
      console.error("Verification failed - transcript not found after update");
      return NextResponse.json({
        error: "Failed to save transcript - verification failed",
        details: "The update appeared to succeed but transcript is still null",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      knowledge_item: knowledgeItem,
      video_id: video.id,
      debug: {
        transcriptWordCount: transcript.wordCount,
        aiAnalysisTopics: aiAnalysis.topicTags?.length || 0,
        updateRowsAffected: rowsAffected,
        verified: true,
      }
    });
  } catch (error) {
    console.error("YouTube import error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to import video transcript", details: errorMessage },
      { status: 500 }
    );
  }
}
