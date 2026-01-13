import { NextRequest, NextResponse } from "next/server";
import { farzadKnowledge, searchKnowledge } from "@/lib/knowledge";

// GET - Retrieve all knowledge items or search
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (query) {
    const results = searchKnowledge(query, 5);
    return NextResponse.json({ items: results });
  }

  return NextResponse.json({ items: farzadKnowledge });
}

// POST - Add new knowledge item (for future database integration)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, source, sourceUrl } = body;

    if (!title || !content || !source) {
      return NextResponse.json(
        { error: "Title, content, and source are required" },
        { status: 400 }
      );
    }

    // In production, this would add to a database
    // For now, we'll just return success with the formatted item
    const newItem = {
      id: `manual-${Date.now()}`,
      source: source as "youtube" | "manual",
      title,
      content,
      sourceUrl,
      createdAt: new Date(),
    };

    return NextResponse.json({
      message: "Knowledge item created successfully",
      item: newItem,
      note: "In development mode, this item is not persisted. Connect to a database for persistence.",
    });
  } catch (error) {
    console.error("Knowledge API error:", error);
    return NextResponse.json(
      { error: "Failed to process knowledge request" },
      { status: 500 }
    );
  }
}
