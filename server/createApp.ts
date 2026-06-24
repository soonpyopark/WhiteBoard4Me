import express from 'express';
import { createApiRouter } from './api.ts';

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use('/api', createApiRouter());
  return app;
}
