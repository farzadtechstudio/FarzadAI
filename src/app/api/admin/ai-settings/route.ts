import { NextRequest, NextResponse } from "next/server";
import { USE_SUPABASE } from "@/lib/config";
import { getAIConfig, loadSetupConfig, clearConfigCache } from "@/lib/setup-loader";
import { promises as fs } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
  }

  // Local mode - load from setup config
  if (!USE_SUPABASE || tenantId === "local") {
    const aiConfig = await getAIConfig();

    return NextResponse.json({
      system_prompt: aiConfig.system_prompt || "",
      openai_model: aiConfig.model || "gpt-4-turbo-preview",
      max_tokens: aiConfig.max_tokens || 2000,
      temperature: aiConfig.temperature || 0.7,
    });
  }

  // Supabase mode
  try {
    const { supabase } = await import("@/lib/supabase");

    const { data, error } = await supabase
      .from("tenant_settings")
      .select("system_prompt, openai_model, max_tokens, temperature")
      .eq("tenant_id", tenantId)
      .single();

    if (error) throw error;

    return NextResponse.json({
      system_prompt: data?.system_prompt || "",
      openai_model: data?.openai_model || "gpt-4-turbo-preview",
      max_tokens: data?.max_tokens || 2000,
      temperature: data?.temperature || 0.7,
    });
  } catch (error) {
    console.error("AI settings fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch AI settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, system_prompt, openai_model, max_tokens, temperature } = body;

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
          ai: {
            system_prompt,
            model: openai_model,
            max_tokens,
            temperature,
          },
        };

        await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
        clearConfigCache();

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("Failed to update local config:", error);
        return NextResponse.json({ error: "Failed to update AI settings" }, { status: 500 });
      }
    }

    // Supabase mode
    const { supabase } = await import("@/lib/supabase");

    const { error } = await supabase
      .from("tenant_settings")
      .update({
        system_prompt,
        openai_model,
        max_tokens,
        temperature,
      })
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AI settings update error:", error);
    return NextResponse.json({ error: "Failed to update AI settings" }, { status: 500 });
  }
}
