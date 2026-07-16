#!/usr/bin/env node
/**
 * Erzeugt store-taugliche Pakete aus dist/<target> in packages/.
 *   node scripts/package.mjs chromium|firefox|safari
 * Firefox: ZIP kann bei AMO signiert werden (web-ext sign) -> XPI.
 * Safari: ZIP + dokumentierter Konvertierungsworkflow (siehe safari/README.md).
 */
import AdmZip from 'adm-zip';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
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

function addDirectory(zip, dir, zipPath = '') {
  const entries = readdirSync(dir).sort((a, b) => a.localeCompare(b));
  for (const entry of entries) {
    const absolute = path.join(dir, entry);
    if (statSync(absolute).isDirectory()) {
      addDirectory(zip, absolute, zipPath ? `${zipPath}/${entry}` : entry);
    } else {
      zip.addLocalFile(absolute, zipPath);
    }
  }
}

rmSync(outFile, { force: true });
const zip = new AdmZip();
addDirectory(zip, dist);
zip.writeZip(outFile);
console.log(`Paket erstellt: ${path.relative(root, outFile)}`);
