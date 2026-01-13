import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { USE_SUPABASE, KNOWLEDGE_BASE } from "@/lib/config";
import { getAIConfig } from "@/lib/setup-loader";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, tenantId } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    // Load AI config (from setup or defaults)
    const aiConfig = await getAIConfig();
    let systemPrompt = aiConfig.system_prompt;
    let model = aiConfig.model;
    let maxTokens = aiConfig.max_tokens;
    let temperature = aiConfig.temperature;

    // Get the latest user message for knowledge search
    const latestUserMessage = messages
      .filter((m: { role: string }) => m.role === "user")
      .pop();

    // Search knowledge base for relevant context
    if (latestUserMessage) {
      let knowledgeItems: { title: string; content: string }[] = [];

      if (USE_SUPABASE && tenantId && tenantId !== "local") {
        // Use Supabase for tenant-specific knowledge
        const { supabase } = await import("@/lib/supabase");

        const { data: settings } = await supabase
          .from("tenant_settings")
          .select("system_prompt, openai_model, max_tokens, temperature")
          .eq("tenant_id", tenantId)
          .single();

        if (settings) {
          systemPrompt = settings.system_prompt || systemPrompt;
          model = settings.openai_model || model;
          maxTokens = settings.max_tokens || maxTokens;
          temperature = settings.temperature || temperature;
        }

        const { data } = await supabase
          .from("knowledge_items")
          .select("title, content")
          .eq("tenant_id", tenantId)
          .limit(5);

        if (data) {
          knowledgeItems = data;
        }
      } else {
        // Use local knowledge base
        const query = latestUserMessage.content.toLowerCase();
        knowledgeItems = KNOWLEDGE_BASE.filter(
          (item) =>
            item.title.toLowerCase().includes(query.substring(0, 30)) ||
            item.content.toLowerCase().includes(query.substring(0, 30))
        ).slice(0, 3);

        // If no matches, include first 2 items as general context
        if (knowledgeItems.length === 0) {
          knowledgeItems = KNOWLEDGE_BASE.slice(0, 2);
        }
      }

      // Add knowledge context to system prompt
      if (knowledgeItems.length > 0) {
        const context = knowledgeItems
          .map((item) => `### ${item.title}\n${item.content}`)
          .join("\n\n---\n\n");

        systemPrompt += `\n\n## Relevant Context from Knowledge Base:\n${context}\n\nUse this context when relevant to inform your response.`;
      }
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const responseMessage = completion.choices[0]?.message?.content;

    if (!responseMessage) {
      throw new Error("No response from OpenAI");
    }

    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key. Please check your OpenAI API key." },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
