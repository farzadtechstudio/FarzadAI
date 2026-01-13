-- Supabase Schema for White-Label AI Platform
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table (each brand/influencer)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL, -- subdomain identifier
  custom_domain VARCHAR(255) UNIQUE, -- optional custom domain
  brand_name VARCHAR(100) NOT NULL,
  tagline VARCHAR(255),
  owner_name VARCHAR(100) NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3b5998',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant settings (AI configuration)
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  welcome_title VARCHAR(255) DEFAULT 'What do you want to understand?',
  welcome_subtitle TEXT,
  placeholder_text VARCHAR(255) DEFAULT 'What should we think through together?',
  system_prompt TEXT NOT NULL,
  disclaimer_text TEXT,
  openai_model VARCHAR(50) DEFAULT 'gpt-4-turbo-preview',
  max_tokens INTEGER DEFAULT 2000,
  temperature DECIMAL(2,1) DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topic cards (the 4 quick-start topics)
CREATE TABLE tenant_topic_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  icon VARCHAR(50) NOT NULL, -- icon identifier
  title VARCHAR(100) NOT NULL,
  description TEXT,
  suggested_prompt TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge base items
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL CHECK (source IN ('youtube', 'manual', 'document')),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (admin/staff for each tenant)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat sessions (optional - for analytics)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255), -- anonymous visitor tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages (optional - for analytics)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX idx_knowledge_tenant ON knowledge_items(tenant_id);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_topic_cards_tenant ON tenant_topic_cards(tenant_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_topic_cards_updated_at BEFORE UPDATE ON tenant_topic_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_items_updated_at BEFORE UPDATE ON knowledge_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default Farzad tenant as example
INSERT INTO tenants (slug, brand_name, tagline, owner_name, primary_color)
VALUES ('farzad', 'Farzad AI', 'Independent Thinker''s Assistant', 'Farzad Mesbahi', '#3b5998');

-- Get the tenant ID for settings
DO $$
DECLARE
  tenant_uuid UUID;
BEGIN
  SELECT id INTO tenant_uuid FROM tenants WHERE slug = 'farzad';

  -- Insert default settings
  INSERT INTO tenant_settings (tenant_id, welcome_title, welcome_subtitle, system_prompt, disclaimer_text)
  VALUES (
    tenant_uuid,
    'What do you want to understand about the future?',
    'Ask me anything about technology, AI, Tesla, markets, or building - I''ll break it down with first-principles thinking and real-world context.',
    'You are Farzad AI, an AI assistant that embodies Farzad Mesbahi''s thinking style, perspectives, and communication approach. You help people understand complex topics related to technology, investing, AI, Tesla, and the future.

Your Core Characteristics:
1. First Principles Thinker: Break down complex problems to fundamental truths.
2. Long-term Perspective: Think in 5-10 year timeframes.
3. Clear Communicator: Explain complex topics simply.
4. Independent Thinker: Challenge consensus when warranted.
5. Optimistic Realist: Fundamentally optimistic but grounded.
6. Intellectually Honest: Acknowledge uncertainty.

Be direct and substantive. Use structured thinking. Provide concrete examples.',
    'This AI is inspired by Farzad''s thinking. It provides general insights, not financial, legal, or personal advice.'
  );

  -- Insert default topic cards
  INSERT INTO tenant_topic_cards (tenant_id, icon, title, description, suggested_prompt, "order") VALUES
  (tenant_uuid, 'car', 'Tesla & Autonomy', 'Clear explanations on FSD, robotics, manufacturing, and Tesla''s long-term strategy.', 'Can you explain Tesla''s Full Self-Driving strategy and how it compares to other autonomous vehicle approaches?', 1),
  (tenant_uuid, 'brain', 'AI & The Future of Work', 'How AI reshapes careers, productivity, and the next decade of opportunity.', 'How will AI transform the job market over the next 5-10 years, and how should people prepare?', 2),
  (tenant_uuid, 'globe', 'Innovation & Society', 'The deeper implications of technology shifts on daily life and work.', 'What are the most significant ways technology is changing society that people aren''t paying enough attention to?', 3),
  (tenant_uuid, 'target', 'Strategy & First Principles', 'Frameworks for reasoning clearly about complex, uncertain problems.', 'Can you explain first-principles thinking and how to apply it to make better decisions?', 4);
END $$;
