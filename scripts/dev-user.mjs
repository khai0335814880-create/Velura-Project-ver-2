/**
 * Khởi động User Web cùng API mà nó phụ thuộc.
 * Nếu API đã chạy, script sẽ dùng lại tiến trình hiện có.
 */
import { spawn } from "node:child_process";
import { platform } from "node:os";
import { SCRIPT_CONFIG } from "./config.mjs";

const npmCommand = platform() === "win32" ? "npm.cmd" : "npm";
const apiHealthUrl = `${SCRIPT_CONFIG.API_ORIGIN}/health`;
const children = new Set();

function log(name, message) {
  for (const line of String(message).split(/\r?\n/).filter(Boolean)) {
    console.log(`[${name}] ${line}`);
  }
}

function startService(name, args) {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    stdio: ["inherit", "pipe", "pipe"],
    shell: platform() === "win32"
  });

  children.add(child);
  child.stdout.on("data", (data) => log(name, data));
  child.stderr.on("data", (data) => log(name, data));
  child.on("close", (code) => {
    children.delete(child);
    log(name, `Tiến trình đã dừng (mã ${code ?? "không xác định"}).`);
  });

  return child;
}

async function isApiReady() {
  try {
    const response = await fetch(apiHealthUrl, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForApi(apiProcess, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (apiProcess.exitCode !== null) {
      throw new Error("API đã dừng trong khi khởi động. Hãy xem thông báo [API] phía trên.");
    }
    if (await isApiReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`API không sẵn sàng sau 20 giây tại ${apiHealthUrl}.`);
}

function stopChildren() {
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}

process.once("SIGINT", () => {
  stopChildren();
  process.exit(0);
});
process.once("SIGTERM", () => {
  stopChildren();
  process.exit(0);
});

try {
  if (await isApiReady()) {
    console.log(`[API] Đã sẵn sàng tại ${SCRIPT_CONFIG.API_ORIGIN}.`);
  } else {
    console.log(`[API] Đang khởi động tại ${SCRIPT_CONFIG.API_ORIGIN}...`);
    const apiProcess = startService("API", ["run", "dev:api:watch"]);
    await waitForApi(apiProcess);
    console.log("[API] Khởi động thành công.");
  }

  startService("User", ["run", "dev:user:web"]);
} catch (error) {
  console.error(`[Khởi động] ${error.message}`);
  stopChildren();
  process.exitCode = 1;
}
