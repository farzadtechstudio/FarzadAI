-- Add missing tenant_youtube_settings table
-- Run this in your Supabase SQL Editor

-- First, check if uuid-ossp extension is enabled (needed for uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenant_youtube_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE,
  channel_id VARCHAR(100),
  channel_name VARCHAR(255),
  api_key TEXT,
  last_synced TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint only if tenants table exists (for flexibility)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
    -- Drop existing constraint if any
    ALTER TABLE tenant_youtube_settings DROP CONSTRAINT IF EXISTS tenant_youtube_settings_tenant_id_fkey;
    -- Note: We're NOT adding a foreign key constraint for now to allow more flexibility
    -- In production, you might want to add: ALTER TABLE tenant_youtube_settings ADD CONSTRAINT tenant_youtube_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add missing columns to videos table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'channel_id') THEN
    ALTER TABLE videos ADD COLUMN channel_id VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'channel_name') THEN
    ALTER TABLE videos ADD COLUMN channel_name VARCHAR(255);
  END IF;

  -- CRITICAL: Add transcript and ai_analysis columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'transcript') THEN
    ALTER TABLE videos ADD COLUMN transcript JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'ai_analysis') THEN
    ALTER TABLE videos ADD COLUMN ai_analysis JSONB;
  END IF;
END $$;

-- Create index for tenant_youtube_settings
CREATE INDEX IF NOT EXISTS idx_youtube_settings_tenant ON tenant_youtube_settings(tenant_id);

-- Disable RLS for this table (for now - enable with proper policies later)
ALTER TABLE tenant_youtube_settings DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on other tables that need to be accessible
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items DISABLE ROW LEVEL SECURITY;
