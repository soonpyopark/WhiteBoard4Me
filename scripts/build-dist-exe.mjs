import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(2);
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yy}${mm}${dd}-${hh}${min}${ss}`;
}

function copyDirectory(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

const buildName = `WhiteBoard4Me-${formatTimestamp(new Date())}`;
const finalOutDir = path.resolve('exe', buildName);
const stagingOutDir = path.join(os.tmpdir(), `wb-exe-build-${buildName}`);

fs.mkdirSync('exe', { recursive: true });
if (fs.existsSync(stagingOutDir)) {
  fs.rmSync(stagingOutDir, { recursive: true, force: true });
}
if (fs.existsSync(finalOutDir)) {
  fs.rmSync(finalOutDir, { recursive: true, force: true });
}

console.log(`\nBuilding USB-ready app folder: ${buildName}`);
console.log(`Output directory: exe\\${buildName}\n`);

execSync('node scripts/prepare-icon.mjs', { stdio: 'inherit' });

execSync('npm run build', { stdio: 'inherit' });
execSync('node scripts/build-electron.mjs', { stdio: 'inherit' });

const builderCmd = [
  'npx electron-builder',
  '--win dir',
  `--config.directories.output="${stagingOutDir}"`,
].join(' ');

execSync(builderCmd, { stdio: 'inherit' });

const winUnpackedDir = path.join(stagingOutDir, 'win-unpacked');
if (!fs.existsSync(winUnpackedDir)) {
  throw new Error(`Expected build output not found: ${winUnpackedDir}`);
}

copyDirectory(winUnpackedDir, finalOutDir);

const dataSrc = path.resolve('data');
const dataDest = path.join(finalOutDir, 'data');
if (fs.existsSync(dataSrc)) {
  console.log('Copying data/ to build output...');
  copyDirectory(dataSrc, dataDest);
} else {
  fs.mkdirSync(dataDest, { recursive: true });
  console.log('Created empty data/ in build output.');
}

const envExampleSrc = path.resolve('.env.example');
if (fs.existsSync(envExampleSrc)) {
  fs.copyFileSync(envExampleSrc, path.join(finalOutDir, '.env.example'));
}

fs.rmSync(stagingOutDir, { recursive: true, force: true });

console.log(
  `\nDone. Copy this folder to USB and run WhiteBoard4Me.exe inside:\n  ${finalOutDir}\n  (whiteboard data: ${path.join(finalOutDir, 'data')})\n`,
);
