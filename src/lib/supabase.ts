import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase é usado APENAS como transporte Realtime (broadcast).
 * Nenhuma tabela, nenhum banco, nenhuma auth — nunca use supabase.from(...).
 * Só é instanciado quando NEXT_PUBLIC_TRANSPORT=supabase.
 */
let client: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Transporte supabase selecionado, mas NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não estão definidos.',
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}
