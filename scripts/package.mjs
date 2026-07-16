#!/usr/bin/env node
/**
 * Erzeugt store-taugliche Pakete aus dist/<target> in packages/.
 *   node scripts/package.mjs chromium|firefox|safari
 * Firefox: ZIP kann bei AMO signiert werden (web-ext sign) -> XPI.
 * Safari: ZIP + dokumentierter Konvertierungsworkflow (siehe safari/README.md).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
if (!['chromium', 'firefox', 'safari'].includes(target)) {
  console.error('Usage: node scripts/package.mjs <chromium|firefox|safari>');
  process.exit(1);
}
const dist = path.join(root, 'dist', target);
if (!existsSync(path.join(dist, 'manifest.json'))) {
  console.error(`dist/${target} fehlt – zuerst bauen: npm run build:${target}`);
  process.exit(1);
}
const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const outDir = path.join(root, 'packages');
mkdirSync(outDir, { recursive: true });
const ext = target === 'firefox' ? 'xpi' : 'zip';
const outFile = path.join(outDir, `wikipedia-quick-search-${target}-v${version}.${ext}`);
execFileSync('zip', ['-r', '-X', '-q', outFile, '.'], { cwd: dist });
console.log(`Paket erstellt: ${path.relative(root, outFile)}`);
