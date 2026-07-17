import { spawn } from "node:child_process";

const port = process.env.SMOKE_API_PORT || "8799";
const child = spawn(process.execPath, ["apps/api/src/server.js"], {
  env: {
    ...process.env,
    PORT: port,
    VELURA_SUPABASE_URL: process.env.VELURA_SUPABASE_URL || "https://gtyuajboeffmfskofoyh.supabase.co",
    VELURA_SUPABASE_ANON_KEY: process.env.VELURA_SUPABASE_ANON_KEY || "sb_publishable_boQ_U1tSUZLbI7_0-NQvcg_3s_TEjfm"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  await wait(800);
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await response.json();
  if (!response.ok || body.ok !== true || body.service !== "velura-api") {
    throw new Error(`Unexpected health response: ${response.status} ${JSON.stringify(body)}`);
  }
  console.log("API smoke check passed.");
} finally {
  child.kill();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
