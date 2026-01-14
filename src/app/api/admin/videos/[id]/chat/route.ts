import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "local-dev-secret-change-in-production";

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: Message[];
}

interface TopicTag {
  name: string;
  confidence?: number;
  relevance?: number;
}

interface SentimentTone {
  overall: string;
  confidence?: number;
  emotions?: string[];
  energyLevel?: string;
}

interface Insight {
  text: string;
  category: string;
  importance?: number;
  timestamp?: string;
}

interface FactCheck {
  status: string;
  explanation?: string;
}

interface Claim {
  text: string;
  type: string;
  confidence?: number;
  timeframe?: string;
  factCheck?: FactCheck;
}

interface AIAnalysis {
  topicTags?: TopicTag[];
  sentimentTone?: SentimentTone;
  insights?: Insight[];
  claims?: Claim[];
  topics?: string[];
  sentiment?: string[];
  keyInsights?: { text: string; type: string }[];
}

interface TranscriptData {
  fullText: string;
  segments?: Array<{ text: string; start: number; duration: number }>;
}

interface VideoData {
  id: string;
  video_id: string;
  title: string;
  transcript?: TranscriptData;
  ai_analysis?: AIAnalysis;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const body: ChatRequest = await request.json();
    const { message, history = [] } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get tenant ID from JWT auth token
    let tenantId: string | null = null;
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token");

    if (authToken?.value) {
      try {
        const decoded = jwt.verify(authToken.value, JWT_SECRET) as JWTPayload;
        tenantId = decoded.tenantId;
      } catch (err) {
        console.error("JWT verification failed:", err);
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Unauthorized - no valid session" },
        { status: 401 }
      );
    }

    // Fetch video from Supabase
    const { createServerClient } = await import("@/lib/supabase");
    const supabase = createServerClient();

    // Check if videoId looks like a UUID (for database id) or YouTube video ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);

    let query = supabase
      .from("videos")
      .select("id, video_id, title, transcript, ai_analysis")
      .eq("tenant_id", tenantId);

    if (isUUID) {
      query = query.eq("id", videoId);
    } else {
      query = query.eq("video_id", videoId);
    }

    const { data: video, error: videoError } = await query.single();

    if (videoError || !video) {
      console.error("Video not found:", { videoId, tenantId, error: videoError });
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const videoData = video as VideoData;

    if (!videoData.transcript) {
      return NextResponse.json(
        { error: "No transcript available for this video" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    // Build context from transcript and analysis
    const transcriptText = videoData.transcript.fullText;
    const analysis = videoData.ai_analysis;

    let contextBlock = `VIDEO TITLE: ${videoData.title}\n\n`;
    contextBlock += `TRANSCRIPT:\n${transcriptText}\n\n`;

    if (analysis) {
      contextBlock += `AI ANALYSIS:\n`;

      if (analysis.topicTags && analysis.topicTags.length > 0) {
        contextBlock += `Topics: ${analysis.topicTags.map(t => t.name).join(", ")}\n`;
      } else if (analysis.topics && analysis.topics.length > 0) {
        contextBlock += `Topics: ${analysis.topics.join(", ")}\n`;
      }

      if (analysis.sentimentTone) {
        contextBlock += `Sentiment: ${analysis.sentimentTone.overall}`;
        if (analysis.sentimentTone.energyLevel) {
          contextBlock += ` (Energy: ${analysis.sentimentTone.energyLevel})`;
        }
        contextBlock += `\n`;
        if (analysis.sentimentTone.emotions && analysis.sentimentTone.emotions.length > 0) {
          contextBlock += `Emotions: ${analysis.sentimentTone.emotions.join(", ")}\n`;
        }
      }

      if (analysis.insights && analysis.insights.length > 0) {
        contextBlock += `\nKey Insights:\n`;
        analysis.insights.forEach((insight, i) => {
          contextBlock += `${i + 1}. [${insight.category}] ${insight.text}\n`;
        });
      } else if (analysis.keyInsights && analysis.keyInsights.length > 0) {
        contextBlock += `\nKey Insights:\n`;
        analysis.keyInsights.forEach((insight, i) => {
          contextBlock += `${i + 1}. [${insight.type}] ${insight.text}\n`;
        });
      }

      if (analysis.claims && analysis.claims.length > 0) {
        contextBlock += `\nClaims & Predictions:\n`;
        analysis.claims.forEach((claim, i) => {
          let claimText = `${i + 1}. [${claim.type}] ${claim.text}`;
          if (claim.timeframe) {
            claimText += ` (Timeframe: ${claim.timeframe})`;
          }
          if (claim.factCheck) {
            claimText += ` - Fact check: ${claim.factCheck.status}`;
            if (claim.factCheck.explanation) {
              claimText += ` (${claim.factCheck.explanation})`;
            }
          }
          contextBlock += claimText + "\n";
        });
      }
    }

    // Build conversation history for Claude - filter out any empty messages
    const conversationMessages = history
      .filter((msg) => msg.content && msg.content.trim())
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    // Add current user message
    conversationMessages.push({
      role: "user" as const,
      content: message,
    });

    // Debug log
    console.log("Sending to Claude - messages count:", conversationMessages.length);

    // Call Claude Opus 4.5
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 2048,
        system: `You are an AI assistant helping users understand and explore a video transcript. You have access to the full transcript and AI-generated analysis of the video.

Your role is to:
- Answer questions about the video content accurately based on the transcript
- Reference specific parts of the transcript when relevant
- Provide insights based on the AI analysis (topics, sentiment, claims, predictions)
- Help users find specific information mentioned in the video
- Summarize or explain concepts discussed in the video
- Be conversational and helpful

IMPORTANT - Always format your responses using markdown:
- Use **bold** for emphasis and key terms
- Use bullet points (- or *) for lists of items
- Use numbered lists (1. 2. 3.) for sequential steps or ranked items
- Use ### for section headings when organizing longer responses
- Use > for quoting specific parts of the transcript
- Keep paragraphs short and readable
- For predictions or data with multiple attributes, prefer bullet points over tables for readability
- Tables are okay for simple comparisons but keep them small (2-4 columns max)

Always base your answers on the actual transcript and analysis provided. If something isn't covered in the transcript, say so.

Here is the video context:

${contextBlock}`,
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Claude API error:", errorData);
      return NextResponse.json(
        { error: "Failed to get AI response", details: errorData.substring(0, 500) },
        { status: 500 }
      );
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text || "Sorry, I couldn't generate a response.";

    return NextResponse.json({
      message: assistantMessage,
      videoId,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
