import { localToWorld, worldToLocal } from './pathObject';
import { getObjectLocalBounds } from './sceneObject';
import { pressureToWidth } from './pressure';
import type { HandleId, HandlePosition, LassoPoint, PathObject, Rect, SceneObject, StrokePoint } from './types';
import { HANDLE_RADIUS, ROTATION_HANDLE_OFFSET } from './types';

function getObjectLocalBoundsForHandles(obj: SceneObject): Rect {
  return getObjectLocalBounds(obj);
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function hitTestPath(path: PathObject, wx: number, wy: number): boolean {
  const local = worldToLocal(wx, wy, path.transform);
  const extra = 4 / path.transform.scale;

  if (path.points.length === 1) {
    const p = path.points[0];
    const w =
      pressureToWidth(p, path.baseWidth, path.minWidth, path.maxWidth) / 2 + extra;
    return Math.hypot(local.x - p.x, local.y - p.y) <= w;
  }

  for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1];
    const b = path.points[i];
    const wA =
      pressureToWidth(a, path.baseWidth, path.minWidth, path.maxWidth) / 2 + extra;
    const wB =
      pressureToWidth(b, path.baseWidth, path.minWidth, path.maxWidth) / 2 + extra;
    const threshold = Math.max(wA, wB);
    const d = distToSegment(local.x, local.y, a.x, a.y, b.x, b.y);
    if (d <= threshold) return true;
  }

  return false;
}

export function hitTestPaths(
  paths: PathObject[],
  wx: number,
  wy: number,
): PathObject | null {
  for (let i = paths.length - 1; i >= 0; i--) {
    if (hitTestPath(paths[i], wx, wy)) return paths[i];
  }
  return null;
}

export function pointInPolygon(x: number, y: number, polygon: LassoPoint[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

function onSegment(x1: number, y1: number, x2: number, y2: number, px: number, py: number): boolean {
  return (
    px >= Math.min(x1, x2) - 1e-9 &&
    px <= Math.max(x1, x2) + 1e-9 &&
    py >= Math.min(y1, y2) - 1e-9 &&
    py <= Math.max(y1, y2) + 1e-9
  );
}

function segmentsIntersect(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number,
): boolean {
  const d1 = cross(ax2 - ax1, ay2 - ay1, bx1 - ax1, by1 - ay1);
  const d2 = cross(ax2 - ax1, ay2 - ay1, bx2 - ax1, by2 - ay1);
  const d3 = cross(bx2 - bx1, by2 - by1, ax1 - bx1, ay1 - by1);
  const d4 = cross(bx2 - bx1, by2 - by1, ax2 - bx1, ay2 - by1);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  if (d1 === 0 && onSegment(ax1, ay1, ax2, ay2, bx1, by1)) return true;
  if (d2 === 0 && onSegment(ax1, ay1, ax2, ay2, bx2, by2)) return true;
  if (d3 === 0 && onSegment(bx1, by1, bx2, by2, ax1, ay1)) return true;
  if (d4 === 0 && onSegment(bx1, by1, bx2, by2, ax2, ay2)) return true;

  return false;
}

export function segmentIntersectsPolygon(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  polygon: LassoPoint[],
): boolean {
  if (pointInPolygon(x1, y1, polygon) || pointInPolygon(x2, y2, polygon)) return true;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    if (
      segmentsIntersect(x1, y1, x2, y2, polygon[i].x, polygon[i].y, polygon[j].x, polygon[j].y)
    ) {
      return true;
    }
  }

  return false;
}

export function rectIntersectsPolygon(rect: Rect, polygon: LassoPoint[]): boolean {
  if (polygon.length < 3) return false;

  const { x, y, w, h } = rect;
  if (w <= 0 && h <= 0) {
    return pointInPolygon(x, y, polygon);
  }

  const corners = [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
  ];

  for (const c of corners) {
    if (pointInPolygon(c.x, c.y, polygon)) return true;
  }

  for (const p of polygon) {
    if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) return true;
  }

  const edges: [number, number, number, number][] = [
    [x, y, x + w, y],
    [x + w, y, x + w, y + h],
    [x + w, y + h, x, y + h],
    [x, y + h, x, y],
  ];

  for (const [x1, y1, x2, y2] of edges) {
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      if (segmentsIntersect(x1, y1, x2, y2, polygon[i].x, polygon[i].y, polygon[j].x, polygon[j].y)) {
        return true;
      }
    }
  }

  return false;
}

/** 사각형 네 꼭짓점이 모두 다각형 안에 있을 때만 true */
export function rectContainedInPolygon(rect: Rect, polygon: LassoPoint[]): boolean {
  if (polygon.length < 3) return false;

  const { x, y, w, h } = rect;
  if (w <= 0 && h <= 0) {
    return pointInPolygon(x, y, polygon);
  }

  const corners = [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
  ];

  return corners.every((c) => pointInPolygon(c.x, c.y, polygon));
}

export function pathIntersectsLasso(path: PathObject, lasso: LassoPoint[]): boolean {
  if (lasso.length < 3 || path.tool === 'eraser') return false;

  for (const p of lasso) {
    if (hitTestPath(path, p.x, p.y)) return true;
  }

  for (const p of path.points) {
    const w = localToWorld(p.x, p.y, path.transform);
    if (pointInPolygon(w.x, w.y, lasso)) return true;
  }

  for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1];
    const b = path.points[i];
    const wa = localToWorld(a.x, a.y, path.transform);
    const wb = localToWorld(b.x, b.y, path.transform);
    if (segmentIntersectsPolygon(wa.x, wa.y, wb.x, wb.y, lasso)) return true;

    const dx = wb.x - wa.x;
    const dy = wb.y - wa.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(3, (path.maxWidth * path.transform.scale) / 2);
    const steps = Math.ceil(dist / step);
    for (let j = 0; j <= steps; j++) {
      const t = steps === 0 ? 0 : j / steps;
      const x = wa.x + dx * t;
      const y = wa.y + dy * t;
      if (pointInPolygon(x, y, lasso)) return true;
    }
  }

  const bounds = getSelectionOBB(path);
  const pad = path.maxWidth / 2 + 2 / path.transform.scale;
  return rectIntersectsPolygon(
    { x: bounds.x - pad, y: bounds.y - pad, w: bounds.w + pad * 2, h: bounds.h + pad * 2 },
    lasso,
  );
}

/** 획 전체(선 두께 포함)가 올가미 안에 들어올 때만 true */
export function pathContainedInLasso(path: PathObject, lasso: LassoPoint[]): boolean {
  if (lasso.length < 3 || path.tool === 'eraser') return false;

  for (const p of path.points) {
    const w = localToWorld(p.x, p.y, path.transform);
    if (!pointInPolygon(w.x, w.y, lasso)) return false;
  }

  for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1];
    const b = path.points[i];
    const wa = localToWorld(a.x, a.y, path.transform);
    const wb = localToWorld(b.x, b.y, path.transform);
    const dx = wb.x - wa.x;
    const dy = wb.y - wa.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(3, (path.maxWidth * path.transform.scale) / 2);
    const steps = Math.ceil(dist / step);
    for (let j = 0; j <= steps; j++) {
      const t = steps === 0 ? 0 : j / steps;
      const x = wa.x + dx * t;
      const y = wa.y + dy * t;
      if (!pointInPolygon(x, y, lasso)) return false;
    }
  }

  const bounds = getSelectionOBB(path);
  const pad = path.maxWidth / 2 + 2 / path.transform.scale;
  return rectContainedInPolygon(
    { x: bounds.x - pad, y: bounds.y - pad, w: bounds.w + pad * 2, h: bounds.h + pad * 2 },
    lasso,
  );
}

export function hitTestPathsInLasso(
  paths: PathObject[],
  lasso: LassoPoint[],
): PathObject | null {
  if (lasso.length < 3) return null;

  for (let i = paths.length - 1; i >= 0; i--) {
    if (pathIntersectsLasso(paths[i], lasso)) return paths[i];
  }
  return null;
}

export function getHandlePositions(obj: SceneObject): HandlePosition[] {
  const local = getObjectLocalBoundsForHandles(obj);
  const corners: { id: HandleId; lx: number; ly: number }[] = [
    { id: 'nw', lx: local.x, ly: local.y },
    { id: 'ne', lx: local.x + local.w, ly: local.y },
    { id: 'sw', lx: local.x, ly: local.y + local.h },
    { id: 'se', lx: local.x + local.w, ly: local.y + local.h },
  ];

  const handles: HandlePosition[] = corners.map(({ id, lx, ly }) => {
    const w = localToWorld(lx, ly, obj.transform);
    return { id, x: w.x, y: w.y };
  });

  const topMidLx = local.x + local.w / 2;
  const topMidLy = local.y;
  const rotateLocal = {
    x: topMidLx,
    y: topMidLy - ROTATION_HANDLE_OFFSET / obj.transform.scale,
  };
  const rotateWorld = localToWorld(rotateLocal.x, rotateLocal.y, obj.transform);

  handles.push({ id: 'rotate', x: rotateWorld.x, y: rotateWorld.y });
  return handles;
}

/** @deprecated use getHandlePositions */
export function getSelectionOBB(obj: SceneObject): Rect {
  const local = getObjectLocalBoundsForHandles(obj);
  const corners = [
    localToWorld(local.x, local.y, obj.transform),
    localToWorld(local.x + local.w, local.y, obj.transform),
    localToWorld(local.x, local.y + local.h, obj.transform),
    localToWorld(local.x + local.w, local.y + local.h, obj.transform),
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function hitTestHandle(
  obj: SceneObject,
  wx: number,
  wy: number,
  hitRadius = HANDLE_RADIUS + 2,
): HandleId | null {
  const handles = getHandlePositions(obj);
  for (const h of handles) {
    if (Math.hypot(wx - h.x, wy - h.y) <= hitRadius) return h.id;
  }
  return null;
}

function pathHitByEraserStroke(
  path: PathObject,
  eraserPoints: StrokePoint[],
  baseWidth: number,
  minWidth: number,
  maxWidth: number,
): boolean {
  if (path.tool === 'eraser' || eraserPoints.length === 0) return false;

  for (const p of eraserPoints) {
    if (hitTestPath(path, p.x, p.y)) return true;
  }

  for (let i = 1; i < eraserPoints.length; i++) {
    const from = eraserPoints[i - 1];
    const to = eraserPoints[i];
    const widthFrom = pressureToWidth(from, baseWidth, minWidth, maxWidth);
    const widthTo = pressureToWidth(to, baseWidth, minWidth, maxWidth);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(2, Math.min(dist, (widthFrom + widthTo) / 4));
    const steps = Math.ceil(dist / step);

    for (let j = 0; j <= steps; j++) {
      const t = steps === 0 ? 0 : j / steps;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      if (hitTestPath(path, x, y)) return true;
    }
  }

  return false;
}

export function pathsHitByEraserStroke(
  paths: PathObject[],
  eraserPoints: StrokePoint[],
  baseWidth: number,
  minWidth: number,
  maxWidth: number,
): PathObject[] {
  const hit: PathObject[] = [];
  const seen = new Set<string>();

  for (const path of paths) {
    if (seen.has(path.id)) continue;
    if (
      pathHitByEraserStroke(path, eraserPoints, baseWidth, minWidth, maxWidth)
    ) {
      seen.add(path.id);
      hit.push(path);
    }
  }

  return hit;
}
