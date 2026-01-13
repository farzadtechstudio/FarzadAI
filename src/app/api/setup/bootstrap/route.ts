import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

const USE_SUPABASE = process.env.USE_SUPABASE === "true";

// POST - Bootstrap initial tenant and admin user
// This should only be called once during initial setup
export async function POST(request: NextRequest) {
  try {
    if (!USE_SUPABASE) {
      return NextResponse.json(
        { error: "Supabase is not enabled" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      email,
      password,
      name,
      brandName = "Farzad AI",
      tenantSlug = "default"
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if any tenants exist
    const { data: existingTenants, error: checkError } = await supabase
      .from("tenants")
      .select("id")
      .limit(1);

    if (checkError) {
      console.error("Error checking tenants:", checkError);
      return NextResponse.json(
        { error: "Failed to check existing setup: " + checkError.message },
        { status: 500 }
      );
    }

    if (existingTenants && existingTenants.length > 0) {
      return NextResponse.json(
        { error: "Setup already completed. Tenant already exists." },
        { status: 400 }
      );
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        slug: tenantSlug,
        brand_name: brandName,
        settings: {},
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Error creating tenant:", tenantError);
      return NextResponse.json(
        { error: "Failed to create tenant: " + tenantError.message },
        { status: 500 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        tenant_id: tenant.id,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        role: "owner",
        is_active: true,
      })
      .select()
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      // Try to clean up tenant
      await supabase.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json(
        { error: "Failed to create user: " + userError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully!",
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        brand_name: tenant.brand_name,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json(
      { error: "An error occurred during setup" },
      { status: 500 }
    );
  }
}

// GET - Check if setup is needed
export async function GET() {
  try {
    if (!USE_SUPABASE) {
      return NextResponse.json({
        setupRequired: false,
        message: "Running in local mode (Supabase not enabled)",
      });
    }

    const supabase = createServerClient();

    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { error: "Failed to check setup status: " + error.message },
        { status: 500 }
      );
    }

    const setupRequired = !tenants || tenants.length === 0;

    return NextResponse.json({
      setupRequired,
      message: setupRequired
        ? "Initial setup required. POST to this endpoint with email, password, name, and optionally brandName."
        : "Setup already completed.",
    });
  } catch (error) {
    console.error("Setup check error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
