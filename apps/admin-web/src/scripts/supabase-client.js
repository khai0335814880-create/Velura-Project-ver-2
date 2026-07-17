// Single source of truth for the Supabase browser client used by every admin
// page. Sharing this module guarantees the login page and the OAuth callback
// page read the SAME storage backend with the SAME storageKey, which is
// required for the PKCE code verifier to survive the redirect.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-auth.js";

const STORAGE_KEY = "sb-gtyuajboeffmfskofoyh-auth-token";

let cachedClient = null;

export function getSupabaseClient({ detectSessionInUrl = false } = {}) {
  if (cachedClient) return cachedClient;
  if (!window.supabase?.createClient) {
    throw new Error("Supabase JS UMD bundle is not loaded yet");
  }
  cachedClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: STORAGE_KEY,
      storage: window.localStorage
    }
  });
  return cachedClient;
}

export const SUPABASE_STORAGE_KEY = STORAGE_KEY;
