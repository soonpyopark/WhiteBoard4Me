import { Router } from 'express';
import {
  copyWhiteboard,
  createWhiteboard,
  deleteWhiteboard,
  getWhiteboard,
  listWhiteboards,
  reorderWhiteboards,
  renameWhiteboard,
  saveWhiteboard,
} from './storage.ts';

export function createApiRouter(): Router {
  const router = Router();

  router.get('/whiteboards', async (_req, res) => {
    try {
      const boards = await listWhiteboards();
      res.json(boards);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to list whiteboards' });
    }
  });

  router.post('/whiteboards', async (_req, res) => {
    try {
      const doc = await createWhiteboard();
      res.status(201).json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create whiteboard' });
    }
  });

  router.put('/whiteboards/order', async (req, res) => {
    try {
      const { order } = req.body as { order?: string[] };
      if (!Array.isArray(order)) {
        res.status(400).json({ error: 'Order array required' });
        return;
      }
      const boards = await reorderWhiteboards(order);
      res.json(boards);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to reorder whiteboards' });
    }
  });

  router.get('/whiteboards/:id', async (req, res) => {
    try {
      const doc = await getWhiteboard(req.params.id);
      if (!doc) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to get whiteboard' });
    }
  });

  router.put('/whiteboards/:id', async (req, res) => {
    try {
      const doc = await saveWhiteboard(req.params.id, req.body);
      if (!doc) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save whiteboard' });
    }
  });

  router.patch('/whiteboards/:id', async (req, res) => {
    try {
      const { title } = req.body as { title?: string };
      if (!title) {
        res.status(400).json({ error: 'Title required' });
        return;
      }
      const doc = await renameWhiteboard(req.params.id, title);
      if (!doc) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to rename whiteboard' });
    }
  });

  router.post('/whiteboards/:id/copy', async (req, res) => {
    try {
      const doc = await copyWhiteboard(req.params.id);
      if (!doc) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(201).json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to copy whiteboard' });
    }
  });

  router.delete('/whiteboards/:id', async (req, res) => {
    try {
      const ok = await deleteWhiteboard(req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete whiteboard' });
    }
  });

  return router;
}
