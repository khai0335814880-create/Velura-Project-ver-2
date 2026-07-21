/**
 * Khởi động API cho môi trường phát triển mà không tạo tiến trình trùng.
 */
import { spawn } from "node:child_process";
import { platform } from "node:os";
import { SCRIPT_CONFIG } from "./config.mjs";

const npmCommand = platform() === "win32" ? "npm.cmd" : "npm";
const healthUrl = `${SCRIPT_CONFIG.API_ORIGIN}/health`;

async function findRunningVeluraApi() {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1200) });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.ok === true && body?.service === "velura-api";
  } catch {
    return false;
  }
}

const apiIsAlreadyRunning = await findRunningVeluraApi();

if (apiIsAlreadyRunning) {
  console.log(`Velura API đã chạy tại ${SCRIPT_CONFIG.API_ORIGIN}. Không cần khởi động thêm.`);
  console.log("Nếu muốn khởi động lại API, hãy dừng tiến trình đang chạy bằng Ctrl + C trước.");
} else {
  const child = spawn(npmCommand, ["run", "dev:api:watch"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: platform() === "win32"
  });

  function stopChild() {
    if (child.exitCode === null) child.kill("SIGTERM");
  }

  process.once("SIGINT", stopChild);
  process.once("SIGTERM", stopChild);

  child.on("error", (error) => {
    console.error(`Không thể khởi động API: ${error.message}`);
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 1;
  });
}
