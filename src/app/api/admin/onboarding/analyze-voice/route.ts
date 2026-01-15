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

interface VoiceAnalysisRequest {
  tenantId: string;
  creatorName: string;
  voiceSamples: string[];
  voiceDescription: string;
}

interface VoiceAnalysis {
  toneKeywords: string[];
  signaturePhrases: string[];
  sentencePatterns: string;
  vocabularyLevel: string;
  phrasesToAvoid: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: VoiceAnalysisRequest = await request.json();
    const { tenantId, creatorName, voiceSamples, voiceDescription } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Verify auth
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token");

    if (!authToken?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(authToken.value, JWT_SECRET) as JWTPayload;
      if (decoded.tenantId !== tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Need either voice samples or description
    if (voiceSamples.length === 0 && !voiceDescription) {
      return NextResponse.json(
        { error: "Please provide voice samples or a description" },
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

    // Build the analysis prompt
    let contentToAnalyze = "";

    if (voiceSamples.length > 0) {
      contentToAnalyze += "## TRANSCRIPT SAMPLES:\n\n";
      voiceSamples.forEach((sample, i) => {
        contentToAnalyze += `### Sample ${i + 1}:\n${sample}\n\n`;
      });
    }

    if (voiceDescription) {
      contentToAnalyze += `## CREATOR'S SELF-DESCRIPTION:\n${voiceDescription}\n\n`;
    }

    const prompt = `Analyze these transcript samples from ${creatorName || "this creator"} and extract detailed voice characteristics.

${contentToAnalyze}

Based on this content, provide a JSON analysis with the following structure:

{
  "toneKeywords": ["5-8 adjectives that describe this voice"],
  "signaturePhrases": ["recurring phrases or expressions used"],
  "sentencePatterns": "description of sentence style - short/punchy, long/detailed, mixed, etc.",
  "vocabularyLevel": "description of vocabulary - technical, casual, academic, conversational, etc.",
  "phrasesToAvoid": ["any patterns that seem inconsistent, forced, or generic"]
}

Focus on:
1. **Tone Keywords**: What adjectives best describe this communication style? (e.g., conversational, analytical, enthusiastic, direct, warm)
2. **Signature Phrases**: Any phrases or expressions they use repeatedly
3. **Sentence Patterns**: Are sentences short and punchy? Long and detailed? Do they use questions? Do they vary length?
4. **Vocabulary Level**: Is language technical, casual, academic, conversational? Do they use jargon, slang, or formal terms?
5. **Phrases to Avoid**: Any patterns that feel inconsistent, generic, or forced

Return ONLY the JSON object, no additional text.`;

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
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Claude API error:", errorData);
      return NextResponse.json(
        { error: "Failed to analyze voice", details: errorData.substring(0, 500) },
        { status: 500 }
      );
    }

    const data = await response.json();
    const responseText = data.content?.[0]?.text || "";

    // Parse the JSON response
    try {
      // Extract JSON from the response (in case there's any surrounding text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const analysis: VoiceAnalysis = JSON.parse(jsonMatch[0]);

      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error("Failed to parse voice analysis:", parseError);
      console.error("Response text:", responseText);

      // Return a default structure if parsing fails
      return NextResponse.json({
        toneKeywords: ["Conversational"],
        signaturePhrases: [],
        sentencePatterns: "Unable to determine - please add more samples",
        vocabularyLevel: "Unable to determine - please add more samples",
        phrasesToAvoid: [],
      });
    }
  } catch (error) {
    console.error("Voice analysis error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
