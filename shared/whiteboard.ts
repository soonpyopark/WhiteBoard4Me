import type { ImageObject, PathObject, TextObject } from './drawing.ts';

export interface WhiteboardDocument {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  paths: PathObject[];
  images?: ImageObject[];
  texts?: TextObject[];
  thumbnail?: string;
}

export interface WhiteboardSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

export interface SaveWhiteboardPayload {
  title?: string;
  paths: PathObject[];
  images?: ImageObject[];
  texts?: TextObject[];
  thumbnail?: string;
}
