import fs from "node:fs";
import path from "node:path";

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_ROOTS = ["apps", "scripts", "database/seed"];
const SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".html"]);
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git", "dist", "build"]);
const CONFIG_GATEWAYS = new Set([
  "apps/api/src/config.js",
  "apps/admin-web/src/scripts/config.js",
  "apps/user-web/src/scripts/config.js",
  "apps/admin-web/vite.config.js",
  "apps/user-web/vite.config.js",
  "scripts/config.mjs",
  "scripts/check-config.mjs"
]);

const RULES = [
  {
    name: "direct environment access outside a configuration gateway",
    pattern: /\b(?:process\.env|import\.meta\.env)\b/g
  },
  {
    name: "hardcoded loopback endpoint",
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1):\d+/g
  },
  {
    name: "hardcoded infrastructure port",
    pattern: /\b(?:8787|8799|3001|5174)\b/g
  }
];

const violations = [];

for (const scanRoot of SCAN_ROOTS) {
  collectFiles(path.join(WORKSPACE_ROOT, scanRoot)).forEach(checkFile);
}

if (violations.length) {
  console.error("Configuration guard failed:\n");
  for (const violation of violations) {
    console.error(`[${violation.file}:${violation.line}] ${violation.rule}`);
    console.error(`  ${violation.snippet}`);
  }
  process.exit(1);
}

console.log("Configuration guard passed: no hardcoded endpoints, infrastructure ports, or direct environment reads outside config gateways.");

function collectFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
}

function checkFile(absolutePath) {
  const relativePath = path.relative(WORKSPACE_ROOT, absolutePath).replaceAll("\\", "/");
  if (CONFIG_GATEWAYS.has(relativePath)) return;

  const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      if (!rule.pattern.test(line)) continue;
      violations.push({
        file: relativePath,
        line: index + 1,
        rule: rule.name,
        snippet: line.trim()
      });
    }
  });
}
