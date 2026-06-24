import { getObjectWorldBounds, getSceneObjectsSorted } from './sceneObject';
import { getPathWorldBounds } from './pathObject';
import { renderPath } from './pathRenderer';
import { getCachedImage, renderImage } from './imageRenderer';
import { renderText } from './textRenderer';
import { isTextObject } from './types';
import type { ImageObject, PathObject, Rect, TextObject } from './types';

function unionSceneBounds(
  paths: PathObject[],
  images: ImageObject[],
  texts: TextObject[] = [],
): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const path of paths) {
    const b = getPathWorldBounds(path);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }

  for (const image of images) {
    const b = getObjectWorldBounds(image);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }

  for (const text of texts) {
    const b = getObjectWorldBounds(text);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }

  if (!Number.isFinite(minX)) return null;

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function renderSceneToCanvas(
  ctx: CanvasRenderingContext2D,
  paths: PathObject[],
  images: ImageObject[],
  width: number,
  height: number,
  texts: TextObject[] = [],
): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const bounds = unionSceneBounds(paths, images, texts);
  if (!bounds) return;

  const pad = 16;
  const scale = Math.min(
    (width - pad * 2) / Math.max(bounds.w, 1),
    (height - pad * 2) / Math.max(bounds.h, 1),
  );
  const offsetX = (width - bounds.w * scale) / 2 - bounds.x * scale;
  const offsetY = (height - bounds.h * scale) / 2 - bounds.y * scale;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (const obj of getSceneObjectsSorted(paths, images, texts)) {
    if ('points' in obj) {
      renderPath(ctx, obj);
    } else if (isTextObject(obj)) {
      renderText(ctx, obj);
    } else {
      const htmlImg = getCachedImage(obj.id);
      if (htmlImg) renderImage(ctx, obj, htmlImg);
    }
  }

  ctx.restore();
}

export function generateThumbnail(
  paths: PathObject[],
  images: ImageObject[] = [],
  width = 320,
  height = 200,
  texts: TextObject[] = [],
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  renderSceneToCanvas(ctx, paths, images, width, height, texts);
  return canvas.toDataURL('image/png');
}

function renderSceneAtNaturalScale(
  ctx: CanvasRenderingContext2D,
  paths: PathObject[],
  images: ImageObject[],
  bounds: Rect,
  pad: number,
  texts: TextObject[] = [],
): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.translate(pad - bounds.x, pad - bounds.y);

  for (const obj of getSceneObjectsSorted(paths, images, texts)) {
    if ('points' in obj) {
      renderPath(ctx, obj);
    } else if (isTextObject(obj)) {
      renderText(ctx, obj);
    } else {
      const htmlImg = getCachedImage(obj.id);
      if (htmlImg) renderImage(ctx, obj, htmlImg);
    }
  }

  ctx.restore();
}

export function exportSceneAsPng(
  paths: PathObject[],
  images: ImageObject[] = [],
  texts: TextObject[] = [],
): string {
  const bounds = unionSceneBounds(paths, images, texts);
  const pad = 32;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (!bounds) {
    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  canvas.width = Math.ceil(bounds.w + pad * 2);
  canvas.height = Math.ceil(bounds.h + pad * 2);
  renderSceneAtNaturalScale(ctx, paths, images, bounds, pad, texts);
  return canvas.toDataURL('image/png');
}

export function downloadSceneAsPng(
  paths: PathObject[],
  images: ImageObject[] = [],
  filename = 'whiteboard',
  texts: TextObject[] = [],
): void {
  const dataUrl = exportSceneAsPng(paths, images, texts);
  if (!dataUrl) return;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${filename.replace(/[<>:"/\\|?*]/g, '_').trim() || 'whiteboard'}.png`;
  link.click();
}

/** @deprecated */
export function renderPathsToCanvas(
  ctx: CanvasRenderingContext2D,
  paths: PathObject[],
  width: number,
  height: number,
): void {
  renderSceneToCanvas(ctx, paths, [], width, height);
}
