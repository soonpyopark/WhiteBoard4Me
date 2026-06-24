import * as esbuild from 'esbuild';
import fs from 'node:fs';

fs.mkdirSync('electron-dist', { recursive: true });

await esbuild.build({
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'electron-dist/main.cjs',
  external: ['electron'],
  logLevel: 'info',
  banner: {
    js: "const _importMetaUrl = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    'import.meta.url': '_importMetaUrl',
  },
});
