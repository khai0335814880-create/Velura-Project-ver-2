import { CONFIG } from "./config.js";

export const supabaseConfig = {
  url: CONFIG.SUPABASE_URL,
  anonKey: CONFIG.SUPABASE_ANON_KEY
};
