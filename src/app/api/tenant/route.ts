import { NextRequest, NextResponse } from "next/server";
import {
  USE_SUPABASE,
  BRAND_CONFIG,
  WELCOME_CONFIG,
  TOPIC_CARDS,
} from "@/lib/config";
import {
  getBrandConfig,
  getWelcomeConfig,
  getTopicCards,
} from "@/lib/setup-loader";

// Get tenant branding - uses local config or Supabase
export async function GET(request: NextRequest) {
  // If Supabase is not configured, use local config (from setup or defaults)
  if (!USE_SUPABASE) {
    const brandConfig = await getBrandConfig();
    const welcomeConfig = await getWelcomeConfig();
    const topicCards = await getTopicCards();

    return NextResponse.json({
      tenant: {
        id: "local",
        slug: "local",
        brand_name: brandConfig.brand_name,
        tagline: brandConfig.tagline,
        owner_name: brandConfig.owner_name,
        primary_color: brandConfig.primary_color,
        logo_url: brandConfig.logo_url,
      },
      settings: {
        welcome_title: welcomeConfig.welcome_title,
        welcome_subtitle: welcomeConfig.welcome_subtitle,
        placeholder_text: welcomeConfig.placeholder_text,
        disclaimer_text: welcomeConfig.disclaimer_text,
      },
      topicCards: topicCards.map((card, index) => ({
        id: card.id,
        icon: card.icon,
        title: card.title,
        description: card.description,
        suggested_prompt: card.suggested_prompt,
        order: index,
        is_active: true,
      })),
    });
  }

  // Supabase implementation
  const { supabase } = await import("@/lib/supabase");
  const slug = request.nextUrl.searchParams.get("slug");
  const host = request.nextUrl.searchParams.get("host");

  try {
    let tenantQuery = supabase.from("tenants").select("*").eq("is_active", true);

    if (slug) {
      tenantQuery = tenantQuery.eq("slug", slug);
    } else if (host) {
      const hostname = host.split(":")[0];
      const { data: customDomainTenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("custom_domain", hostname)
        .eq("is_active", true)
        .single();

      if (customDomainTenant) {
        return await buildSupabaseResponse(supabase, customDomainTenant);
      }

      const parts = hostname.split(".");
      if (parts.length >= 2) {
        const subdomain = parts[0];
        if (subdomain !== "www" && subdomain !== "localhost") {
          tenantQuery = tenantQuery.eq("slug", subdomain);
        } else {
          tenantQuery = tenantQuery.eq("slug", "farzad");
        }
      } else {
        tenantQuery = tenantQuery.eq("slug", "farzad");
      }
    } else {
      tenantQuery = tenantQuery.eq("slug", "farzad");
    }

    const { data: tenant, error } = await tenantQuery.single();

    if (error || !tenant) {
      // Fallback to local config
      return NextResponse.json({
        tenant: {
          id: "local",
          slug: "local",
          brand_name: BRAND_CONFIG.brand_name,
          tagline: BRAND_CONFIG.tagline,
          owner_name: BRAND_CONFIG.owner_name,
          primary_color: BRAND_CONFIG.primary_color,
          logo_url: BRAND_CONFIG.logo_url,
        },
        settings: {
          welcome_title: WELCOME_CONFIG.welcome_title,
          welcome_subtitle: WELCOME_CONFIG.welcome_subtitle,
          placeholder_text: WELCOME_CONFIG.placeholder_text,
          disclaimer_text: WELCOME_CONFIG.disclaimer_text,
        },
        topicCards: TOPIC_CARDS,
      });
    }

    return await buildSupabaseResponse(supabase, tenant);
  } catch (error) {
    console.error("Tenant fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch tenant" }, { status: 500 });
  }
}

async function buildSupabaseResponse(supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>, tenant: Record<string, unknown>) {
  const [settingsResult, topicsResult] = await Promise.all([
    supabase.from("tenant_settings").select("*").eq("tenant_id", tenant.id).single(),
    supabase
      .from("tenant_topic_cards")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("order", { ascending: true }),
  ]);

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      brand_name: tenant.brand_name,
      tagline: tenant.tagline,
      owner_name: tenant.owner_name,
      primary_color: tenant.primary_color,
      logo_url: tenant.logo_url,
    },
    settings: settingsResult.data
      ? {
          welcome_title: settingsResult.data.welcome_title,
          welcome_subtitle: settingsResult.data.welcome_subtitle,
          placeholder_text: settingsResult.data.placeholder_text,
          disclaimer_text: settingsResult.data.disclaimer_text,
        }
      : null,
    topicCards: topicsResult.data || [],
  });
}
