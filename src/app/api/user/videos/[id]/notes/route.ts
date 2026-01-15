import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createServerClient } from "@/lib/supabase";

const USE_SUPABASE = process.env.USE_SUPABASE === "true";
const JWT_SECRET = process.env.JWT_SECRET || "local-dev-secret-change-in-production";

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

// Helper to get user context from either session cookie or auth_token JWT
async function getUserContext(): Promise<{ userId: string; tenantId: string } | null> {
  const cookieStore = await cookies();

  // Try session cookie first (public user)
  const sessionCookie = cookieStore.get("session");
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session.userId && session.tenantId) {
        return { userId: session.userId, tenantId: session.tenantId };
      }
    } catch {
      // Continue to try auth_token
    }
  }

  // Try auth_token JWT (admin user)
  const authToken = cookieStore.get("auth_token");
  if (authToken?.value) {
    try {
      const decoded = jwt.verify(authToken.value, JWT_SECRET) as JWTPayload;
      if (decoded.userId && decoded.tenantId) {
        return { userId: decoded.userId, tenantId: decoded.tenantId };
      }
    } catch {
      // JWT invalid
    }
  }

  return null;
}

// GET - Fetch user's notes for a video
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;

    if (!USE_SUPABASE) {
      return NextResponse.json({ notes: [], useLocalStorage: true });
    }

    // Get user context from session or auth_token
    const userContext = await getUserContext();
    if (!userContext) {
      return NextResponse.json({ notes: [], useLocalStorage: true });
    }

    const { userId, tenantId } = userContext;
    const supabase = createServerClient();

    const { data: notes, error } = await supabase
      .from("video_notes")
      .select("id, title, type, content, created_at")
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return NextResponse.json({ notes: [], useLocalStorage: true });
    }

    return NextResponse.json({
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        type: n.type,
        content: n.content,
        createdAt: n.created_at,
      })),
      useLocalStorage: false,
    });
  } catch (error) {
    console.error("Notes GET error:", error);
    return NextResponse.json({ notes: [], useLocalStorage: true });
  }
}

// POST - Create a new note
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;
    const body = await request.json();
    const { title, type, content } = body;

    if (!title || !type || !content) {
      return NextResponse.json(
        { error: "Title, type, and content are required" },
        { status: 400 }
      );
    }

    if (!USE_SUPABASE) {
      return NextResponse.json({
        success: true,
        useLocalStorage: true,
        note: {
          id: Date.now().toString(),
          title,
          type,
          content,
          createdAt: new Date().toISOString(),
        }
      });
    }

    // Get user context from session or auth_token
    const userContext = await getUserContext();
    if (!userContext) {
      return NextResponse.json({
        success: true,
        useLocalStorage: true,
        note: {
          id: Date.now().toString(),
          title,
          type,
          content,
          createdAt: new Date().toISOString(),
        }
      });
    }

    const { userId, tenantId } = userContext;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("video_notes")
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        video_id: videoId,
        title,
        type,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving note:", error);
      return NextResponse.json({
        success: true,
        useLocalStorage: true,
        note: {
          id: Date.now().toString(),
          title,
          type,
          content,
          createdAt: new Date().toISOString(),
        }
      });
    }

    return NextResponse.json({
      success: true,
      note: {
        id: data.id,
        title: data.title,
        type: data.type,
        content: data.content,
        createdAt: data.created_at,
      },
      useLocalStorage: false,
    });
  } catch (error) {
    console.error("Notes POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to save note" }, { status: 500 });
  }
}

// DELETE - Delete a specific note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    if (!USE_SUPABASE) {
      return NextResponse.json({ success: true, useLocalStorage: true });
    }

    // Get user context from session or auth_token
    const userContext = await getUserContext();
    if (!userContext) {
      return NextResponse.json({ success: true, useLocalStorage: true });
    }

    const { userId, tenantId } = userContext;
    const supabase = createServerClient();

    const { error } = await supabase
      .from("video_notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Error deleting note:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, useLocalStorage: false });
  } catch (error) {
    console.error("Notes DELETE error:", error);
    return NextResponse.json({ success: true, useLocalStorage: true });
  }
}
