import type {
  SaveWhiteboardPayload,
  WhiteboardDocument,
  WhiteboardSummary,
} from '../types/whiteboard';

const API = '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function fetchWhiteboards(): Promise<WhiteboardSummary[]> {
  return request<WhiteboardSummary[]>('/whiteboards');
}

export function createWhiteboard(): Promise<WhiteboardDocument> {
  return request<WhiteboardDocument>('/whiteboards', { method: 'POST' });
}

export function fetchWhiteboard(id: string): Promise<WhiteboardDocument> {
  return request<WhiteboardDocument>(`/whiteboards/${id}`);
}

export function saveWhiteboard(
  id: string,
  payload: SaveWhiteboardPayload,
): Promise<WhiteboardDocument> {
  return request<WhiteboardDocument>(`/whiteboards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function renameWhiteboard(
  id: string,
  title: string,
): Promise<WhiteboardDocument> {
  return request<WhiteboardDocument>(`/whiteboards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export function deleteWhiteboard(id: string): Promise<void> {
  return request<void>(`/whiteboards/${id}`, { method: 'DELETE' });
}

export function formatEditedDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '.').replace(/\.$/, '');
  const time = d.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `편집됨: ${date}. ${time}`;
}
