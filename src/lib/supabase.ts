import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

// Support both NEXT_PUBLIC_ and non-prefixed env vars
function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
}

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
    );
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

// Lazy-initialized supabase client - only accessed when needed
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  },
});

// Server-side client - uses service role key if available, otherwise anon key
export function createServerClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}
