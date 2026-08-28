import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const packageJson = JSON.parse(read('package.json'));
for (const section of ['dependencies', 'devDependencies']) {
  for (const [name, version] of Object.entries(packageJson[section] || {})) {
    if (version === 'latest' || version === '*' || version.startsWith('http')) warnings.push(`${section}.${name} should be pinned before a reproducible production release`);
  }
}

const electron = read('electron/main.cjs');
if (electron.includes('-ExecutionPolicy Bypass')) failures.push('Electron must not launch PowerShell with ExecutionPolicy Bypass');
if (!/contextIsolation\s*:\s*true/.test(electron) || !/nodeIntegration\s*:\s*false/.test(electron)) failures.push('Electron security preferences are missing');
if (!/sandbox\s*:\s*true/.test(electron)) failures.push('Electron renderer sandbox is missing');
if (!electron.includes('Content-Security-Policy')) failures.push('Content Security Policy is missing');

const server = read('server/index.js');
if (!server.includes('POS_API_TOKEN is required')) failures.push('Online API must require POS_API_TOKEN');
if (!server.includes('timingSafeEqual')) failures.push('API token comparison must be timing-safe');
if (!server.includes('rateLimit')) failures.push('Online API rate limiting is missing');

if (warnings.length) {
  console.warn('Production hardening warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (failures.length) {
  console.error('Production security checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Production security checks passed.');
