import { createId } from '../utils/id';
import { pressureToWidth } from './pressure';
import { catmullRomSpline } from './smoothing';
import type {
  DrawingOptions,
  PathObject,
  PathTransform,
  Rect,
  StrokePoint,
  ToolPreset,
} from './types';

export function localToWorld(
  lx: number,
  ly: number,
  transform: PathTransform,
): { x: number; y: number } {
  const sx = lx * transform.scale;
  const sy = ly * transform.scale;
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  return {
    x: transform.cx + sx * cos - sy * sin,
    y: transform.cy + sx * sin + sy * cos,
  };
}

export function worldToLocal(
  wx: number,
  wy: number,
  transform: PathTransform,
): { x: number; y: number } {
  const dx = wx - transform.cx;
  const dy = wy - transform.cy;
  const cos = Math.cos(-transform.rotation);
  const sin = Math.sin(-transform.rotation);
  return {
    x: (dx * cos - dy * sin) / transform.scale,
    y: (dx * sin + dy * cos) / transform.scale,
  };
}

function computeWorldBounds(path: PathObject): Rect {
  const pad = path.maxWidth * path.transform.scale;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of path.points) {
    const w = localToWorld(p.x, p.y, path.transform);
    minX = Math.min(minX, w.x);
    minY = Math.min(minY, w.y);
    maxX = Math.max(maxX, w.x);
    maxY = Math.max(maxY, w.y);
  }

  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

export function getLocalBounds(path: PathObject): Rect {
  const pad = path.maxWidth / 2 + 2;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of path.points) {
    const r =
      pressureToWidth(p, path.baseWidth, path.minWidth, path.maxWidth) / 2 + 2;
    minX = Math.min(minX, p.x - r);
    minY = Math.min(minY, p.y - r);
    maxX = Math.max(maxX, p.x + r);
    maxY = Math.max(maxY, p.y + r);
  }

  if (!Number.isFinite(minX)) {
    return { x: -pad, y: -pad, w: pad * 2, h: pad * 2 };
  }

  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  return a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y;
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  };
}

export function smoothStrokePoints(points: StrokePoint[]): StrokePoint[] {
  if (points.length <= 1) return [...points];
  if (points.length === 2) return catmullRomSpline(points, 10);
  return catmullRomSpline(points, 6);
}

export function createPathFromStroke(
  rawPoints: StrokePoint[],
  options: DrawingOptions,
  preset: ToolPreset,
): PathObject | null {
  if (rawPoints.length === 0) return null;

  const smoothed = smoothStrokePoints(rawPoints);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of smoothed) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const localPoints = smoothed.map((p) => ({
    ...p,
    x: p.x - cx,
    y: p.y - cy,
  }));

  return {
    id: createId(),
    points: localPoints,
    tool: options.tool,
    color: options.color,
    baseWidth: options.baseWidth,
    minWidth: options.minWidth,
    maxWidth: options.maxWidth,
    opacity: options.opacity,
    textured: preset.textured,
    lineEnd: options.lineEnd,
    transform: { cx, cy, rotation: 0, scale: 1 },
  };
}

export function getPathWorldBounds(path: PathObject): Rect {
  return computeWorldBounds(path);
}
