import fs from 'fs/promises';
import path from 'path';
import type { SaveWhiteboardPayload, WhiteboardDocument, WhiteboardSummary } from '../shared/whiteboard.ts';
import { getDataDir } from './paths.ts';

function filePath(id: string): string {
  return path.join(getDataDir(), `${id}.json`);
}

export async function ensureDataDir(): Promise<void> {
  await fs.mkdir(getDataDir(), { recursive: true });
}

export async function listWhiteboards(): Promise<WhiteboardSummary[]> {
  await ensureDataDir();
  const files = await fs.readdir(getDataDir());
  const summaries: WhiteboardSummary[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(getDataDir(), file), 'utf-8');
      const doc = JSON.parse(raw) as WhiteboardDocument;
      summaries.push({
        id: doc.id,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        thumbnail: doc.thumbnail,
      });
    } catch {
      /* skip invalid files */
    }
  }

  return summaries.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getWhiteboard(id: string): Promise<WhiteboardDocument | null> {
  try {
    const raw = await fs.readFile(filePath(id), 'utf-8');
    return JSON.parse(raw) as WhiteboardDocument;
  } catch {
    return null;
  }
}

export async function createWhiteboard(): Promise<WhiteboardDocument> {
  await ensureDataDir();
  const now = new Date().toISOString();
  const doc: WhiteboardDocument = {
    id: crypto.randomUUID(),
    title: '제목 없음',
    createdAt: now,
    updatedAt: now,
    paths: [],
  };
  await fs.writeFile(filePath(doc.id), JSON.stringify(doc, null, 2), 'utf-8');
  return doc;
}

export async function saveWhiteboard(
  id: string,
  payload: SaveWhiteboardPayload,
): Promise<WhiteboardDocument | null> {
  const existing = await getWhiteboard(id);
  if (!existing) return null;

  const doc: WhiteboardDocument = {
    ...existing,
    title: payload.title ?? existing.title,
    paths: payload.paths,
    images: payload.images ?? existing.images ?? [],
    texts: payload.texts ?? existing.texts ?? [],
    thumbnail: payload.thumbnail ?? existing.thumbnail,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(filePath(id), JSON.stringify(doc), 'utf-8');
  return doc;
}

export async function deleteWhiteboard(id: string): Promise<boolean> {
  try {
    await fs.unlink(filePath(id));
    return true;
  } catch {
    return false;
  }
}

export async function renameWhiteboard(
  id: string,
  title: string,
): Promise<WhiteboardDocument | null> {
  const existing = await getWhiteboard(id);
  if (!existing) return null;

  const doc: WhiteboardDocument = {
    ...existing,
    title: title.trim() || '제목 없음',
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(filePath(id), JSON.stringify(doc), 'utf-8');
  return doc;
}

function parseBaseTitle(title: string): string {
  const trimmed = title.trim() || '제목 없음';
  const numbered = trimmed.match(/ \((\d+)\)$/);
  if (numbered) {
    return trimmed.slice(0, -numbered[0].length);
  }
  if (trimmed.endsWith(' (복사)')) {
    return trimmed.slice(0, -' (복사)'.length);
  }
  return trimmed;
}

function nextCopyTitle(baseTitle: string, existingTitles: string[]): string {
  const escaped = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped} \\((\\d+)\\)$`);

  let maxNum = 0;
  for (const title of existingTitles) {
    const match = title.trim().match(pattern);
    if (match) {
      maxNum = Math.max(maxNum, Number.parseInt(match[1], 10));
    }
  }

  return `${baseTitle} (${maxNum + 1})`;
}

function cloneWithNewIds<T extends { id: string }>(items: T[] | undefined): T[] {
  if (!items?.length) return [];
  return items.map((item) => ({ ...item, id: crypto.randomUUID() }));
}

export async function copyWhiteboard(id: string): Promise<WhiteboardDocument | null> {
  const existing = await getWhiteboard(id);
  if (!existing) return null;

  const boards = await listWhiteboards();
  const baseTitle = parseBaseTitle(existing.title);
  const title = nextCopyTitle(
    baseTitle,
    boards.map((board) => board.title),
  );

  await ensureDataDir();
  const now = new Date().toISOString();
  const doc: WhiteboardDocument = {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    paths: cloneWithNewIds(existing.paths),
    images: cloneWithNewIds(existing.images),
    texts: cloneWithNewIds(existing.texts),
    thumbnail: existing.thumbnail,
  };

  await fs.writeFile(filePath(doc.id), JSON.stringify(doc, null, 2), 'utf-8');
  return doc;
}
