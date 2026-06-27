import { spawnSync } from 'node:child_process';
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const outDir = 'electron-dist';
const staticAssets = ['splash.html', 'splash-icon.png', 'icon.png'];

fs.mkdirSync(outDir, { recursive: true });

const iconSrc = path.join('electron', 'icon.png');
if (!fs.existsSync(iconSrc)) {
  const prepare = spawnSync('node', ['scripts/prepare-icon.mjs'], {
    stdio: 'inherit',
    cwd: path.resolve('.'),
  });
  if (prepare.status !== 0) {
    throw new Error('Failed to prepare electron/icon.png');
  }
}

await esbuild.build({
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(outDir, 'main.cjs'),
  external: ['electron'],
  logLevel: 'info',
  banner: {
    js: "const _importMetaUrl = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    'import.meta.url': '_importMetaUrl',
  },
});

for (const file of staticAssets) {
  const src = path.join('electron', file);
  const dest = path.join(outDir, file);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing electron asset: ${src}`);
  }
  fs.copyFileSync(src, dest);
}
