/**
 * Velura — Dev Launcher
 * Khởi động đồng thời API server + Admin web + User web
 * Sử dụng: npm start  (hoặc npm run dev)
 */
import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { SCRIPT_CONFIG } from './config.mjs';

const isWindows = platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const services = [
  { name: 'API',   cmd: npmCmd, args: ['run', 'dev:api'],   color: '\x1b[36m' },   // Cyan
  { name: 'Admin', cmd: npmCmd, args: ['run', 'dev:admin'],  color: '\x1b[35m' },   // Magenta
  { name: 'User',  cmd: npmCmd, args: ['run', 'dev:user'],   color: '\x1b[32m' },   // Green
];

const reset = '\x1b[0m';

console.log('');
console.log('╔═══════════════════════════════════════════════╗');
console.log('║     🛍️  Velura Fashion Shop — Dev Server      ║');
console.log('╠═══════════════════════════════════════════════╣');
console.log(`║  API Server   →  ${SCRIPT_CONFIG.API_ORIGIN}`);
console.log(`║  Admin Panel  →  ${SCRIPT_CONFIG.ADMIN_WEB_ORIGIN}`);
console.log(`║  User Shop    →  ${SCRIPT_CONFIG.USER_WEB_ORIGIN}`);
console.log('╚═══════════════════════════════════════════════╝');
console.log('');

for (const svc of services) {
  const child = spawn(svc.cmd, svc.args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  const prefix = `${svc.color}[${svc.name}]${reset}`;

  child.stdout.on('data', (data) => {
    for (const line of data.toString().split('\n').filter(Boolean)) {
      console.log(`${prefix} ${line}`);
    }
  });

  child.stderr.on('data', (data) => {
    for (const line of data.toString().split('\n').filter(Boolean)) {
      console.log(`${prefix} ${line}`);
    }
  });

  child.on('close', (code) => {
    console.log(`${prefix} Process exited with code ${code}`);
  });
}
