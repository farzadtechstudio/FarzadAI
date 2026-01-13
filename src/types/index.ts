export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  suggestedPrompt: string;
}

export interface KnowledgeItem {
  id: string;
  tenant_id: string;
  source: "youtube" | "manual" | "document";
  title: string;
  content: string;
  source_url?: string;
  created_at: Date;
  updated_at: Date;
}

// Multi-tenant / White-label types
export interface Tenant {
  id: string;
  slug: string; // subdomain: aly.farzadai.com -> slug = "aly"
  custom_domain?: string; // optional custom domain: alygpt.com
  brand_name: string; // "Aly AI", "Farzad AI"
  tagline: string; // "Independent Thinker's Assistant"
  owner_name: string; // The person this AI represents
  logo_url?: string;
  favicon_url?: string;
  primary_color: string; // hex color
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface TenantSettings {
  id: string;
  tenant_id: string;
  welcome_title: string; // "What do you want to understand about the future?"
  welcome_subtitle: string;
  placeholder_text: string; // Input placeholder
  system_prompt: string; // Custom AI personality/instructions
  disclaimer_text: string;
  openai_model: string;
  max_tokens: number;
  temperature: number;
}

export interface TenantTopicCard {
  id: string;
  tenant_id: string;
  icon: string;
  title: string;
  description: string;
  suggested_prompt: string;
  order: number;
  is_active: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "staff";
  tenant_id: string;
  created_at: Date;
}

export interface TenantBranding {
  tenant: Tenant;
  settings: TenantSettings;
  topicCards: TenantTopicCard[];
}

export interface Session {
  user: User;
  tenant: Tenant;
  accessToken: string;
}
