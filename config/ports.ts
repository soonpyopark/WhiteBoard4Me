import { loadEnvFiles } from './loadEnv.ts';

const DEFAULT_PORT = 3005;

export { DEFAULT_PORT };

export function parsePort(value: string | undefined, fallback: number = DEFAULT_PORT): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) return fallback;
  return parsed;
}

loadEnvFiles();

/** 앱 포트 (프론트 + API 공통). `.env`의 `PORT`로 설정 (기본 3005). */
export const PORT = parsePort(process.env.PORT, DEFAULT_PORT);

/** 바인딩 주소. `.env`의 `HOSTNAME` (기본 127.0.0.1). */
export const HOSTNAME = process.env.HOSTNAME?.trim() || '127.0.0.1';

function parseAllowedHosts(value: string | undefined): true | string[] | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (trimmed === 'true' || trimmed === '*') return true;

  const hosts = trimmed
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  return hosts.length > 0 ? hosts : undefined;
}

/** Vite dev 허용 Host. `.env`의 `ALLOWED_HOSTS` (쉼표 구분, `*` = 모두 허용). */
export const ALLOWED_HOSTS =
  parseAllowedHosts(process.env.ALLOWED_HOSTS) ??
  (HOSTNAME === '0.0.0.0' ? true : undefined);
