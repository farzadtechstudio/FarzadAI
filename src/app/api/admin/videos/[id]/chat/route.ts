import { NextRequest, NextResponse } from "next/server";
import { loadSetupConfig } from "@/lib/setup-loader";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: Message[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;
    const body: ChatRequest = await request.json();
    const { message, history = [] } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Load video data
    const config = await loadSetupConfig();
    if (!config?.youtube?.videos) {
      return NextResponse.json(
        { error: "No videos found" },
        { status: 404 }
      );
    }

    const video = config.youtube.videos.find((v) => v.video_id === videoId);
    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    if (!video.transcript) {
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
    const transcriptText = video.transcript.fullText;
    const analysis = video.ai_analysis;

    let contextBlock = `VIDEO TITLE: ${video.title}\n\n`;
    contextBlock += `TRANSCRIPT:\n${transcriptText}\n\n`;

    if (analysis) {
      contextBlock += `AI ANALYSIS:\n`;

      if (analysis.topicTags && analysis.topicTags.length > 0) {
        contextBlock += `Topics: ${analysis.topicTags.map(t => t.name).join(", ")}\n`;
      }

      if (analysis.sentimentTone) {
        contextBlock += `Sentiment: ${analysis.sentimentTone.overall} (Energy: ${analysis.sentimentTone.energyLevel})\n`;
        if (analysis.sentimentTone.emotions?.length > 0) {
          contextBlock += `Emotions: ${analysis.sentimentTone.emotions.join(", ")}\n`;
        }
      }

      if (analysis.insights && analysis.insights.length > 0) {
        contextBlock += `\nKey Insights:\n`;
        analysis.insights.forEach((insight, i) => {
          contextBlock += `${i + 1}. [${insight.category}] ${insight.text}\n`;
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

    // Build conversation history for Claude
    const conversationMessages = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add current user message
    conversationMessages.push({
      role: "user" as const,
      content: message,
    });

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
        { error: "Failed to get AI response" },
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
