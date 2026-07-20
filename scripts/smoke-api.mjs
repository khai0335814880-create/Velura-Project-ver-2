import { spawn } from "node:child_process";
import { SCRIPT_CONFIG } from "./config.mjs";

const child = spawn(process.execPath, ["apps/api/src/server.js"], {
  env: SCRIPT_CONFIG.SMOKE_ENV,
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  // Đã tăng thời gian chờ lên một chút để server kịp khởi động
  await wait(2000);
  const response = await fetch(`${SCRIPT_CONFIG.SMOKE_API_ORIGIN}/health`);
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
