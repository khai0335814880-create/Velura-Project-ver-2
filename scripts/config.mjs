function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const devHost = process.env.DEV_HOST || "localhost";
const smokeHost = process.env.SMOKE_API_HOST || "127.0.0.1";
const apiPort = numberFromEnv(process.env.PORT, 8787);
const adminWebPort = numberFromEnv(process.env.ADMIN_WEB_PORT, 5174);
const userWebPort = numberFromEnv(process.env.USER_WEB_PORT, 3001);
const smokeApiPort = numberFromEnv(process.env.SMOKE_API_PORT, 8799);

export const SCRIPT_CONFIG = Object.freeze({
  API_PORT: apiPort,
  ADMIN_WEB_PORT: adminWebPort,
  USER_WEB_PORT: userWebPort,
  SMOKE_API_PORT: smokeApiPort,
  API_ORIGIN: `http://${devHost}:${apiPort}`,
  ADMIN_WEB_ORIGIN: `http://${devHost}:${adminWebPort}`,
  USER_WEB_ORIGIN: `http://${devHost}:${userWebPort}`,
  SMOKE_API_ORIGIN: `http://${smokeHost}:${smokeApiPort}`,
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VELURA_SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL || "",
  SMOKE_ENV: {
    ...process.env,
    PORT: String(smokeApiPort),
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
  }
});
