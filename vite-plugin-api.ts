import type { Connect } from 'vite';
import type { Plugin } from 'vite';
import { createApiApp } from './server/createApp.ts';

/** 개발 모드: Vite 서버에 API 미들웨어를 붙여 단일 포트로 제공 */
export function apiPlugin(): Plugin {
  return {
    name: 'whiteboard-api',
    configureServer(server) {
      const api = createApiApp();
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api')) {
          (api as Connect.NextHandleFunction)(req, res, next);
          return;
        }
        next();
      });
    },
  };
}
