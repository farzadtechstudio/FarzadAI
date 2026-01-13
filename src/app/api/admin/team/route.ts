import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, role, created_at")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ members: data || [] });
  } catch (error) {
    console.error("Team fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, email, name, password, role } = body;

    if (!tenantId || !email || !password) {
      return NextResponse.json(
        { error: "Tenant ID, email, and password required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["admin", "staff"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const result = await createUser(email, password, name, role, tenantId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      member: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role,
      },
    });
  } catch (error) {
    console.error("Team create error:", error);
    return NextResponse.json({ error: "Failed to add team member" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Member ID required" }, { status: 400 });
  }

  try {
    // Soft delete - set is_active to false
    const { error } = await supabase
      .from("users")
      .update({ is_active: false })
      .eq("id", id)
      .neq("role", "owner"); // Prevent deleting owner

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team delete error:", error);
    return NextResponse.json({ error: "Failed to remove team member" }, { status: 500 });
  }
}
