function normalizeOrigin(value) {
  return String(value || window.location.origin).replace(/\/+$/, "");
}

export const CONFIG = Object.freeze({
  API_BASE_URL: normalizeOrigin(import.meta.env.VITE_API_BASE_URL),
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
});
