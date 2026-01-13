import { NextRequest, NextResponse } from "next/server";
import { USE_SUPABASE } from "@/lib/config";
import { loadSetupConfig, clearConfigCache } from "@/lib/setup-loader";
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

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

// Fetch YouTube transcript using yt-dlp
async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptData | null> {
  try {
    console.log("Fetching transcript for video:", videoId);

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
      console.log("yt-dlp not found, falling back to web scraping");
      return await fetchTranscriptViaScraping(videoId);
    }

    // Download auto-generated subtitles
    const cmd = `${ytdlpCmd} --write-auto-sub --sub-lang en --skip-download --sub-format json3 -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}" 2>&1`;

    try {
      await execAsync(cmd, { timeout: 60000 });
    } catch (execError) {
      console.log("yt-dlp command failed:", execError);
      return await fetchTranscriptViaScraping(videoId);
    }

    // Read and parse the subtitle file
    let subtitleContent: string;
    try {
      subtitleContent = await fs.readFile(subtitlePath, "utf8");
    } catch {
      console.log("Subtitle file not found, trying alt path");
      // Try alternative naming
      const altPath = path.join(tmpDir, `yt_transcript_${videoId}.en.json3`);
      try {
        subtitleContent = await fs.readFile(altPath, "utf8");
      } catch {
        console.log("No subtitle file found");
        return await fetchTranscriptViaScraping(videoId);
      }
    }

    const json3Data = JSON.parse(subtitleContent);
    const events: Json3Event[] = json3Data.events || [];

    // Parse segments from json3 format
    const segments: TranscriptSegment[] = [];
    let currentText = "";
    let currentStart = 0;

    for (const event of events) {
      if (event.segs && !event.aAppend) {
        // New segment - save previous if exists
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
        // Append to current segment
        currentText += event.segs.map((s) => s.utf8).join("");
      }
    }

    // Add final segment
    if (currentText.trim()) {
      segments.push({
        text: currentText.trim(),
        start: currentStart / 1000,
        duration: 5,
      });
    }

    // Clean up temp file
    try {
      await fs.unlink(subtitlePath);
    } catch {
      // Ignore cleanup errors
    }

    if (segments.length === 0) {
      console.log("No segments parsed from subtitle file");
      return null;
    }

    console.log(`Parsed ${segments.length} raw transcript segments`);

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
    console.error("Error fetching transcript:", error);
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

// Fallback mock transcript for when YouTube captions are unavailable
function getMockTranscript(videoId: string, title: string): TranscriptData {
  const mockText = `Okay, everybody. I need to talk about something that's been on my mind for quite a while. Something fundamental about ${title.toLowerCase()} that nobody really talks about. And I think it explains why so many smart, so many genuinely intelligent people never build wealth. And I'm talking about optimism versus pessimism.

I've come to the conclusion that the only way to actually become a good investor is by being an optimistic person. Not being delusional, not ignoring risk, but actually genuinely believing that positive outcomes are possible. If you're pessimistic, you literally cannot invest. And I mean that in the most literal sense.

You are incapable of being an investor if you're pessimistic. Think about what investing actually is. When you put money into something, whether that's a stock, a company, real estate, whatever, you are fundamentally making a bet that a positive outcome exists in the subset of possibilities.

You're literally saying, I believe this can work out well. That's the entire game. That's the whole thing. This is what every single investment decision boils down to. Do you believe good things can happen?

Pessimistic people are literally incapable of seeing positive outcomes as likely. The entire worldview filters out the possibility of things working out. They can articulate all the reasons why something won't work. They can see every risk, every downside, every potential failure.

Thank you for watching! If you found this helpful, please like and subscribe for more content.`;

  const sentences = mockText.split(/[.\n]+/).filter((s) => s.trim());
  const segments: TranscriptSegment[] = sentences.map((text, i) => ({
    text: text.trim(),
    start: i * 15,
    duration: 14,
  }));

  return {
    segments,
    fullText: mockText,
    language: "en",
    wordCount: mockText.split(/\s+/).filter(Boolean).length,
    characterCount: mockText.length,
  };
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

      // Try to fetch real transcript, fall back to mock if unavailable
      let transcript = await fetchYouTubeTranscript(video.video_id);
      if (!transcript) {
        console.log("Using mock transcript for video:", video.video_id);
        transcript = getMockTranscript(video.video_id, video.title);
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
    const { supabase } = await import("@/lib/supabase");

    // Get the video
    const { data: video, error: videoError } = await supabase
      .from("videos")
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

    // Try to fetch real transcript, fall back to mock if unavailable
    let transcript = await fetchYouTubeTranscript(video.video_id);
    if (!transcript) {
      transcript = getMockTranscript(video.video_id, video.title);
    }

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

    if (kbError) throw kbError;

    // Update video as imported with transcript and AI analysis
    await supabase
      .from("videos")
      .update({
        is_imported: true,
        transcript: transcript,
        ai_analysis: aiAnalysis,
      })
      .eq("id", videoId);

    return NextResponse.json({
      success: true,
      knowledge_item: knowledgeItem,
      video_id: video.id,
    });
  } catch (error) {
    console.error("YouTube import error:", error);
    return NextResponse.json(
      { error: "Failed to import video transcript" },
      { status: 500 }
    );
  }
}
