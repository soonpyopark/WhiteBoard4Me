import express from 'express';
import path from 'path';
import type { Server } from 'node:http';
import { DEFAULT_PORT, parsePort } from '../config/ports.ts';
import { createApiApp } from './createApp.ts';
import { getDistDir } from './paths.ts';

let serverInstance: Server | null = null;

export async function startServer(options?: { port?: number; hostname?: string }): Promise<number> {
  const distDir = getDistDir();
  const app = express();

  app.use(createApiApp());
  app.use(express.static(distDir));
  app.use((_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  const preferredPort = options?.port ?? parsePort(process.env.PORT, DEFAULT_PORT);
  const hostname = options?.hostname ?? (process.env.HOSTNAME?.trim() || '127.0.0.1');

  const listen = (port: number): Promise<number> =>
    new Promise((resolve, reject) => {
      const server = app.listen(port, hostname, () => {
        const address = server.address();
        const actualPort =
          typeof address === 'object' && address ? address.port : port;
        serverInstance = server;
        resolve(actualPort);
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE' && port !== 0) {
          listen(0).then(resolve).catch(reject);
          return;
        }
        reject(error);
      });
    });

  return listen(preferredPort);
}

export async function stopServer(): Promise<void> {
  if (!serverInstance) return;

  await new Promise<void>((resolve, reject) => {
    serverInstance!.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  serverInstance = null;
}
