import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function applyEnvContent(content: string, override = false): void {
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && (override || process.env[key] === undefined)) {
      process.env[key] = value;
    }
  }
}

function loadEnvFile(envPath: string, override = false): void {
  if (!existsSync(envPath)) return;
  applyEnvContent(readFileSync(envPath, 'utf8'), override);
}

/** exe/USB 폴더의 `.env`를 우선 적용합니다 (Electron 실행 시). */
export function loadEnvFromAppRoot(appRoot: string): void {
  loadEnvFile(resolve(appRoot, '.env'), true);
}

/** `.env` 후보 경로 중 첫 번째로 존재하는 파일을 읽습니다. */
export function loadEnvFiles(): void {
  const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const candidates = [
    process.env.ELECTRON_APP_ROOT
      ? resolve(process.env.ELECTRON_APP_ROOT, '.env')
      : null,
    process.execPath ? resolve(dirname(process.execPath), '.env') : null,
    resolve(process.cwd(), '.env'),
    resolve(moduleRoot, '.env'),
  ].filter((path): path is string => Boolean(path));

  const seen = new Set<string>();
  for (const envPath of candidates) {
    if (seen.has(envPath)) continue;
    seen.add(envPath);
    if (existsSync(envPath)) {
      loadEnvFile(envPath);
      return;
    }
  }
}
