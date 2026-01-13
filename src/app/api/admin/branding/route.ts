import { NextRequest, NextResponse } from "next/server";
import { USE_SUPABASE } from "@/lib/config";
import { getBrandConfig, getWelcomeConfig, loadSetupConfig, clearConfigCache } from "@/lib/setup-loader";
import { promises as fs } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
  }

  // Local mode - load from setup config
  if (!USE_SUPABASE || tenantId === "local") {
    const brandConfig = await getBrandConfig();
    const welcomeConfig = await getWelcomeConfig();

    return NextResponse.json({
      brand_name: brandConfig.brand_name,
      tagline: brandConfig.tagline,
      owner_name: brandConfig.owner_name,
      primary_color: brandConfig.primary_color,
      logo_url: brandConfig.logo_url || "",
      welcome_title: welcomeConfig.welcome_title,
      welcome_subtitle: welcomeConfig.welcome_subtitle,
      placeholder_text: welcomeConfig.placeholder_text,
      disclaimer_text: welcomeConfig.disclaimer_text,
    });
  }

  // Supabase mode
  try {
    const { supabase } = await import("@/lib/supabase");

    const [tenantResult, settingsResult] = await Promise.all([
      supabase.from("tenants").select("*").eq("id", tenantId).single(),
      supabase.from("tenant_settings").select("*").eq("tenant_id", tenantId).single(),
    ]);

    if (tenantResult.error || !tenantResult.data) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      brand_name: tenantResult.data.brand_name,
      tagline: tenantResult.data.tagline,
      owner_name: tenantResult.data.owner_name,
      primary_color: tenantResult.data.primary_color,
      logo_url: tenantResult.data.logo_url || "",
      welcome_title: settingsResult.data?.welcome_title || "",
      welcome_subtitle: settingsResult.data?.welcome_subtitle || "",
      placeholder_text: settingsResult.data?.placeholder_text || "",
      disclaimer_text: settingsResult.data?.disclaimer_text || "",
    });
  } catch (error) {
    console.error("Branding fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch branding" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      brand_name,
      tagline,
      owner_name,
      primary_color,
      logo_url,
      welcome_title,
      welcome_subtitle,
      placeholder_text,
      disclaimer_text,
    } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Local mode - update setup config file
    if (!USE_SUPABASE || tenantId === "local") {
      const configPath = path.join(process.cwd(), "src", "lib", "setup-config.json");

      try {
        const existingConfig = await loadSetupConfig();

        const updatedConfig = {
          ...existingConfig,
          brand: {
            brand_name,
            tagline,
            owner_name,
            primary_color,
            logo_url,
          },
          welcome: {
            welcome_title,
            welcome_subtitle,
            placeholder_text,
            disclaimer_text,
          },
        };

        await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
        clearConfigCache();

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("Failed to update local config:", error);
        return NextResponse.json({ error: "Failed to update branding" }, { status: 500 });
      }
    }

    // Supabase mode
    const { supabase } = await import("@/lib/supabase");

    const { error: tenantError } = await supabase
      .from("tenants")
      .update({
        brand_name,
        tagline,
        owner_name,
        primary_color,
        logo_url,
      })
      .eq("id", tenantId);

    if (tenantError) throw tenantError;

    const { error: settingsError } = await supabase
      .from("tenant_settings")
      .update({
        welcome_title,
        welcome_subtitle,
        placeholder_text,
        disclaimer_text,
      })
      .eq("tenant_id", tenantId);

    if (settingsError) throw settingsError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Branding update error:", error);
    return NextResponse.json({ error: "Failed to update branding" }, { status: 500 });
  }
}
