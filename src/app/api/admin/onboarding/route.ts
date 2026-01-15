import { NextRequest, NextResponse } from "next/server";
import { USE_SUPABASE } from "@/lib/config";
import { loadSetupConfig, clearConfigCache } from "@/lib/setup-loader";
import { promises as fs } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
  }

  // Local mode - load from setup config
  if (!USE_SUPABASE || tenantId === "local") {
    try {
      const config = await loadSetupConfig();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return NextResponse.json((config as any)?.voice_settings || {});
    } catch {
      return NextResponse.json({});
    }
  }

  // Supabase mode
  try {
    const { supabase } = await import("@/lib/supabase");

    const { data, error } = await supabase
      .from("tenant_settings")
      .select("voice_settings")
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      console.error("Onboarding fetch error:", error);
      return NextResponse.json({});
    }

    return NextResponse.json(data?.voice_settings || {});
  } catch (error) {
    console.error("Onboarding fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch onboarding data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, data: voiceSettings } = body;

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
          voice_settings: voiceSettings,
        };

        await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
        clearConfigCache();

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("Failed to update local config:", error);
        return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 });
      }
    }

    // Supabase mode
    const { supabase } = await import("@/lib/supabase");

    const { error } = await supabase
      .from("tenant_settings")
      .update({
        voice_settings: voiceSettings,
      })
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding save error:", error);
    return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 });
  }
}
