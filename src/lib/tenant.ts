import { supabase } from "./supabase";
import { Tenant, TenantSettings, TenantTopicCard, TenantBranding, KnowledgeItem } from "@/types";

// Get tenant by slug (subdomain)
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as Tenant;
}

// Get tenant by custom domain
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("custom_domain", domain)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as Tenant;
}

// Get tenant settings
export async function getTenantSettings(tenantId: string): Promise<TenantSettings | null> {
  const { data, error } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) return null;
  return data as TenantSettings;
}

// Get tenant topic cards
export async function getTenantTopicCards(tenantId: string): Promise<TenantTopicCard[]> {
  const { data, error } = await supabase
    .from("tenant_topic_cards")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return data as TenantTopicCard[];
}

// Get full tenant branding (tenant + settings + topic cards)
export async function getTenantBranding(slug: string): Promise<TenantBranding | null> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return null;

  const [settings, topicCards] = await Promise.all([
    getTenantSettings(tenant.id),
    getTenantTopicCards(tenant.id),
  ]);

  if (!settings) return null;

  return {
    tenant,
    settings,
    topicCards,
  };
}

// Get tenant from hostname (handles both subdomain and custom domain)
export async function getTenantFromHost(host: string): Promise<Tenant | null> {
  // Remove port if present
  const hostname = host.split(":")[0];

  // Check if it's a custom domain first
  let tenant = await getTenantByDomain(hostname);
  if (tenant) return tenant;

  // Check if it's a subdomain (e.g., aly.farzadai.com)
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    // Could be subdomain.domain.tld
    const slug = parts[0];
    if (slug !== "www") {
      tenant = await getTenantBySlug(slug);
      if (tenant) return tenant;
    }
  }

  // Default to 'farzad' for localhost or main domain
  return getTenantBySlug("farzad");
}

// Get knowledge items for a tenant
export async function getTenantKnowledge(tenantId: string): Promise<KnowledgeItem[]> {
  const { data, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as KnowledgeItem[];
}

// Search knowledge base for a tenant
export async function searchTenantKnowledge(
  tenantId: string,
  query: string,
  limit: number = 3
): Promise<KnowledgeItem[]> {
  // Simple text search - in production you'd use vector embeddings
  const { data, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .limit(limit);

  if (error || !data) return [];
  return data as KnowledgeItem[];
}
