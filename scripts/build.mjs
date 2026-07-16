#!/usr/bin/env node
/**
 * Build-Skript: bündelt die Erweiterung pro Zielbrowser in dist/<target>.
 *   node scripts/build.mjs chromium|firefox|safari [--dev]
 * --dev erzeugt Source Maps; Produktionsbuilds enthalten keine.
 */
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
const dev = process.argv.includes('--dev');

const TARGETS = ['chromium', 'firefox', 'safari'];
if (!TARGETS.includes(target)) {
  console.error(`Usage: node scripts/build.mjs <${TARGETS.join('|')}> [--dev]`);
  process.exit(1);
}

const outdir = path.join(root, 'dist', target);
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const common = {
  bundle: true,
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  target: ['chrome119', 'firefox128', 'safari17'],
  logLevel: 'info',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' }
};

// Background + Content: klassische Scripts (IIFE), kein Framework.
await build({
  ...common,
  entryPoints: [path.join(root, 'src/background/index.ts')],
  format: 'iife',
  outfile: path.join(outdir, 'background.js')
});
await build({
  ...common,
  entryPoints: [path.join(root, 'src/content/index.ts')],
  format: 'iife',
  outfile: path.join(outdir, 'content/index.js')
});
// Extension-Seiten als ES-Module.
await build({
  ...common,
  entryPoints: [path.join(root, 'src/panel/panel.ts')],
  format: 'esm',
  outfile: path.join(outdir, 'panel/panel.js')
});
await build({
  ...common,
  entryPoints: [path.join(root, 'src/options/options.ts')],
  format: 'esm',
  outfile: path.join(outdir, 'options/options.js')
});
await build({
  ...common,
  entryPoints: [path.join(root, 'src/pdf-viewer/viewer.ts')],
  format: 'esm',
  outfile: path.join(outdir, 'pdf-viewer/viewer.js')
});

// Statische Dateien
cpSync(path.join(root, 'src/panel/index.html'), path.join(outdir, 'panel/index.html'));
cpSync(path.join(root, 'src/panel/panel.css'), path.join(outdir, 'panel/panel.css'));
cpSync(path.join(root, 'src/options/options.html'), path.join(outdir, 'options/options.html'));
cpSync(path.join(root, 'src/options/options.css'), path.join(outdir, 'options/options.css'));
cpSync(path.join(root, 'src/pdf-viewer/viewer.html'), path.join(outdir, 'pdf-viewer/viewer.html'));
cpSync(path.join(root, 'src/pdf-viewer/viewer.css'), path.join(outdir, 'pdf-viewer/viewer.css'));
cpSync(path.join(root, '_locales'), path.join(outdir, '_locales'), { recursive: true });
cpSync(path.join(root, 'assets/icons'), path.join(outdir, 'icons'), { recursive: true });

// PDF.js-Worker lokal bündeln (kein Remote Code).
const workerSrc = path.join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
if (existsSync(workerSrc)) {
  cpSync(workerSrc, path.join(outdir, 'pdf-viewer/pdf.worker.min.mjs'));
} else {
  console.warn('WARNUNG: pdf.worker.min.mjs nicht gefunden – npm install ausführen.');
}

// Manifest des Zielbrowsers
const manifest = JSON.parse(
  readFileSync(path.join(root, `manifests/manifest.${target}.json`), 'utf8')
);
writeFileSync(path.join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`Build fertig: dist/${target}${dev ? ' (dev, mit Source Maps)' : ''}`);
