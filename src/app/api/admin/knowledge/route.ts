import { NextRequest, NextResponse } from "next/server";
import { USE_SUPABASE, KNOWLEDGE_BASE } from "@/lib/config";
import { loadSetupConfig, clearConfigCache } from "@/lib/setup-loader";
import { promises as fs } from "fs";
import path from "path";

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

async function getLocalKnowledgeItems(): Promise<KnowledgeItem[]> {
  const setup = await loadSetupConfig();

  if (setup?.knowledgeItems) {
    return setup.knowledgeItems;
  }

  // Return default knowledge base items converted to new format
  return KNOWLEDGE_BASE.map((item, index) => ({
    id: item.id || `kb-${index + 1}`,
    source: "manual" as const,
    title: item.title,
    content: item.content,
    created_at: new Date().toISOString(),
    modified_by: "System",
    modified_by_initials: "SY",
  }));
}

async function saveLocalKnowledgeItems(items: KnowledgeItem[]): Promise<void> {
  const configPath = path.join(process.cwd(), "src", "lib", "setup-config.json");
  const existingConfig = await loadSetupConfig() || {};

  const updatedConfig = {
    ...existingConfig,
    knowledgeItems: items,
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
    const items = await getLocalKnowledgeItems();
    return NextResponse.json({ items });
  }

  // Supabase mode
  try {
    const { supabase } = await import("@/lib/supabase");

    const { data, error } = await supabase
      .from("knowledge_items")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ items: data || [] });
  } catch (error) {
    console.error("Knowledge fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch knowledge" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      source,
      title,
      content,
      source_url,
      category,
      playlist,
      date,
      length,
      modified_by,
      modified_by_initials,
      is_ai_processed,
    } = body;

    if (!tenantId || !title || !content) {
      return NextResponse.json(
        { error: "Tenant ID, title, and content required" },
        { status: 400 }
      );
    }

    // Local mode
    if (!USE_SUPABASE || tenantId === "local") {
      const items = await getLocalKnowledgeItems();

      const newItem: KnowledgeItem = {
        id: `kb-${Date.now()}`,
        source: source || "manual",
        title,
        content,
        source_url,
        category,
        playlist,
        date,
        length: length || content.length,
        modified_by: modified_by || "Admin",
        modified_by_initials: modified_by_initials || "AA",
        is_ai_processed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      items.unshift(newItem);
      await saveLocalKnowledgeItems(items);

      return NextResponse.json({ item: newItem });
    }

    // Supabase mode
    const { supabase } = await import("@/lib/supabase");

    const { data, error } = await supabase
      .from("knowledge_items")
      .insert({
        tenant_id: tenantId,
        source: source || "manual",
        title,
        content,
        source_url,
        category,
        playlist,
        date,
        length: length || content.length,
        modified_by,
        modified_by_initials,
        is_ai_processed,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("Knowledge create error:", error);
    return NextResponse.json({ error: "Failed to create knowledge item" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      id,
      source,
      title,
      content,
      source_url,
      category,
      playlist,
      date,
      length,
      modified_by,
      modified_by_initials,
      is_ai_processed,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    // Local mode
    if (!USE_SUPABASE || tenantId === "local") {
      const items = await getLocalKnowledgeItems();
      const index = items.findIndex((item) => item.id === id);

      if (index === -1) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      items[index] = {
        ...items[index],
        source,
        title,
        content,
        source_url,
        category,
        playlist,
        date,
        length: length || content.length,
        modified_by,
        modified_by_initials,
        is_ai_processed,
        updated_at: new Date().toISOString(),
      };

      await saveLocalKnowledgeItems(items);

      return NextResponse.json({ success: true });
    }

    // Supabase mode
    const { supabase } = await import("@/lib/supabase");

    const { error } = await supabase
      .from("knowledge_items")
      .update({
        title,
        content,
        source,
        source_url,
        category,
        playlist,
        date,
        length: length || content.length,
        modified_by,
        modified_by_initials,
        is_ai_processed,
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Knowledge update error:", error);
    return NextResponse.json({ error: "Failed to update knowledge item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const tenantId = request.nextUrl.searchParams.get("tenantId");

  if (!id) {
    return NextResponse.json({ error: "Item ID required" }, { status: 400 });
  }

  // Local mode
  if (!USE_SUPABASE || tenantId === "local") {
    try {
      const items = await getLocalKnowledgeItems();
      const filteredItems = items.filter((item) => item.id !== id);

      if (filteredItems.length === items.length) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      await saveLocalKnowledgeItems(filteredItems);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Knowledge delete error:", error);
      return NextResponse.json({ error: "Failed to delete knowledge item" }, { status: 500 });
    }
  }

  // Supabase mode
  try {
    const { supabase } = await import("@/lib/supabase");

    const { error } = await supabase.from("knowledge_items").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Knowledge delete error:", error);
    return NextResponse.json({ error: "Failed to delete knowledge item" }, { status: 500 });
  }
}
