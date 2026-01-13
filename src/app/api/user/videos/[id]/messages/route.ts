import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";

const USE_SUPABASE = process.env.USE_SUPABASE === "true";

// GET - Fetch user's chat messages for a video
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;

    if (!USE_SUPABASE) {
      // Return empty if Supabase is not enabled (use localStorage fallback on client)
      return NextResponse.json({ messages: [], useLocalStorage: true });
    }

    // Get user from session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ messages: [], useLocalStorage: true });
    }

    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ messages: [], useLocalStorage: true });
    }

    const userId = session.userId;
    const tenantId = session.tenantId || "local";

    const supabase = createServerClient();

    const { data: messages, error } = await supabase
      .from("video_chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ messages: [], useLocalStorage: true });
    }

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      })),
      useLocalStorage: false,
    });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json({ messages: [], useLocalStorage: true });
  }
}

// POST - Save a new chat message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;
    const body = await request.json();
    const { role, content } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: "Role and content are required" },
        { status: 400 }
      );
    }

    if (!USE_SUPABASE) {
      return NextResponse.json({ success: true, useLocalStorage: true });
    }

    // Get user from session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ success: true, useLocalStorage: true });
    }

    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ success: true, useLocalStorage: true });
    }

    const userId = session.userId;
    const tenantId = session.tenantId || "local";

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("video_chat_messages")
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        video_id: videoId,
        role,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving message:", error);
      return NextResponse.json({ success: true, useLocalStorage: true });
    }

    return NextResponse.json({
      success: true,
      message: {
        id: data.id,
        role: data.role,
        content: data.content,
        createdAt: data.created_at,
      },
      useLocalStorage: false,
    });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json({ success: true, useLocalStorage: true });
  }
}

// DELETE - Clear all chat messages for a video
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;

    if (!USE_SUPABASE) {
      return NextResponse.json({ success: true, useLocalStorage: true });
    }

    // Get user from session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ success: true, useLocalStorage: true });
    }

    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ success: true, useLocalStorage: true });
    }

    const userId = session.userId;
    const tenantId = session.tenantId || "local";

    const supabase = createServerClient();

    const { error } = await supabase
      .from("video_chat_messages")
      .delete()
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Error deleting messages:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, useLocalStorage: false });
  } catch (error) {
    console.error("Messages DELETE error:", error);
    return NextResponse.json({ success: true, useLocalStorage: true });
  }
}
