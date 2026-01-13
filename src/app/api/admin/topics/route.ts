import { NextRequest, NextResponse } from "next/server";
import { USE_SUPABASE } from "@/lib/config";
import { getTopicCards, loadSetupConfig, clearConfigCache } from "@/lib/setup-loader";
import { promises as fs } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
  }

  // Local mode - load from setup config
  if (!USE_SUPABASE || tenantId === "local") {
    const topicCards = await getTopicCards();

    const cards = topicCards.map((card, index) => ({
      id: card.id,
      icon: card.icon,
      title: card.title,
      description: card.description,
      suggested_prompt: card.suggested_prompt,
      order: index,
      is_active: true,
    }));

    return NextResponse.json({ cards });
  }

  // Supabase mode
  try {
    const { supabase } = await import("@/lib/supabase");

    const { data, error } = await supabase
      .from("tenant_topic_cards")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ cards: data || [] });
  } catch (error) {
    console.error("Topics fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, cards } = body;

    if (!tenantId || !cards) {
      return NextResponse.json({ error: "Tenant ID and cards required" }, { status: 400 });
    }

    // Local mode - update setup config file
    if (!USE_SUPABASE || tenantId === "local") {
      const configPath = path.join(process.cwd(), "src", "lib", "setup-config.json");

      try {
        const existingConfig = await loadSetupConfig();

        const topicCards = cards.map((card: Record<string, unknown>, index: number) => ({
          id: card.id || `topic-${index + 1}`,
          icon: card.icon,
          title: card.title,
          description: card.description,
          suggested_prompt: card.suggested_prompt,
        }));

        const updatedConfig = {
          ...existingConfig,
          topicCards,
        };

        await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
        clearConfigCache();

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("Failed to update local config:", error);
        return NextResponse.json({ error: "Failed to update topics" }, { status: 500 });
      }
    }

    // Supabase mode
    const { supabase } = await import("@/lib/supabase");

    // Delete existing cards
    await supabase.from("tenant_topic_cards").delete().eq("tenant_id", tenantId);

    // Insert new cards
    const cardsToInsert = cards.map((card: Record<string, unknown>, index: number) => ({
      tenant_id: tenantId,
      icon: card.icon,
      title: card.title,
      description: card.description,
      suggested_prompt: card.suggested_prompt,
      order: index,
      is_active: card.is_active !== false,
    }));

    const { error } = await supabase.from("tenant_topic_cards").insert(cardsToInsert);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Topics update error:", error);
    return NextResponse.json({ error: "Failed to update topics" }, { status: 500 });
  }
}
