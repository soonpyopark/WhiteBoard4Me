import { getLocalBounds, localToWorld, worldToLocal } from './pathObject';
import {
  hitTestPath,
  pathContainedInLasso,
  pathIntersectsLasso,
  pointInPolygon,
} from './hitTest';
import type { ImageObject, LassoPoint, PathObject, Rect, SceneObject, TextObject } from './types';
import { isTextObject } from './types';

function objectZIndex(obj: SceneObject): number {
  return obj.zIndex ?? 0;
}

export function getNextZIndex(
  paths: PathObject[],
  images: ImageObject[],
  texts: TextObject[] = [],
): number {
  let max = -1;
  for (const path of paths) max = Math.max(max, objectZIndex(path));
  for (const image of images) max = Math.max(max, objectZIndex(image));
  for (const text of texts) max = Math.max(max, objectZIndex(text));
  return max + 1;
}

/** Assign zIndex for documents saved before layer ordering existed. */
export function normalizeSceneZIndices(
  paths: PathObject[],
  images: ImageObject[],
  texts: TextObject[] = [],
): void {
  const hasZIndex =
    paths.some((p) => p.zIndex != null) ||
    images.some((i) => i.zIndex != null) ||
    texts.some((t) => t.zIndex != null);

  if (hasZIndex) {
    let next = getNextZIndex(paths, images, texts);
    for (const path of paths) {
      if (path.zIndex == null) {
        path.zIndex = next;
        next += 1;
      }
    }
    for (const image of images) {
      if (image.zIndex == null) {
        image.zIndex = next;
        next += 1;
      }
    }
    for (const text of texts) {
      if (text.zIndex == null) {
        text.zIndex = next;
        next += 1;
      }
    }
    return;
  }

  let index = 0;
  images.forEach((image) => {
    image.zIndex = index;
    index += 1;
  });
  texts.forEach((text) => {
    text.zIndex = index;
    index += 1;
  });
  paths.forEach((path) => {
    path.zIndex = index;
    index += 1;
  });
}

export function getSceneObjectsSorted(
  paths: PathObject[],
  images: ImageObject[],
  texts: TextObject[] = [],
): SceneObject[] {
  return [...paths, ...images, ...texts].sort((a, b) => objectZIndex(a) - objectZIndex(b));
}

export function getImageLocalBounds(image: ImageObject): Rect {
  return {
    x: -image.width / 2,
    y: -image.height / 2,
    w: image.width,
    h: image.height,
  };
}

export function getTextLocalBounds(text: TextObject): Rect {
  return {
    x: -text.width / 2,
    y: -text.height / 2,
    w: text.width,
    h: text.height,
  };
}

export function getObjectLocalBounds(obj: SceneObject): Rect {
  if ('points' in obj) return getLocalBounds(obj);
  if (isTextObject(obj)) return getTextLocalBounds(obj);
  return getImageLocalBounds(obj);
}

export function getObjectWorldBounds(obj: SceneObject): Rect {
  const local = getObjectLocalBounds(obj);
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

export function hitTestImage(image: ImageObject, wx: number, wy: number): boolean {
  const local = worldToLocal(wx, wy, image.transform);
  const pad = 4 / image.transform.scale;
  const halfW = image.width / 2 + pad;
  const halfH = image.height / 2 + pad;
  return (
    local.x >= -halfW &&
    local.x <= halfW &&
    local.y >= -halfH &&
    local.y <= halfH
  );
}

export function hitTestText(text: TextObject, wx: number, wy: number): boolean {
  const local = worldToLocal(wx, wy, text.transform);
  const pad = 4 / text.transform.scale;
  const halfW = text.width / 2 + pad;
  const halfH = text.height / 2 + pad;
  return (
    local.x >= -halfW &&
    local.x <= halfW &&
    local.y >= -halfH &&
    local.y <= halfH
  );
}

export function hitTestSceneAt(
  paths: PathObject[],
  images: ImageObject[],
  wx: number,
  wy: number,
  texts: TextObject[] = [],
): SceneObject | null {
  const sorted = getSceneObjectsSorted(paths, images, texts);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const obj = sorted[i];
    if ('points' in obj) {
      if (hitTestPath(obj, wx, wy)) return obj;
    } else if (isTextObject(obj)) {
      if (hitTestText(obj, wx, wy)) return obj;
    } else if (hitTestImage(obj, wx, wy)) {
      return obj;
    }
  }
  return null;
}

export function hitTestSceneInLasso(
  paths: PathObject[],
  images: ImageObject[],
  lasso: LassoPoint[],
  texts: TextObject[] = [],
): SceneObject | null {
  const hits = hitAllSceneInLasso(paths, images, lasso, texts);
  return hits.length > 0 ? hits[hits.length - 1] : null;
}

export function hitAllSceneInLasso(
  paths: PathObject[],
  images: ImageObject[],
  lasso: LassoPoint[],
  texts: TextObject[] = [],
): SceneObject[] {
  if (lasso.length < 3) return [];

  const sorted = getSceneObjectsSorted(paths, images, texts);
  const hit: SceneObject[] = [];

  for (const obj of sorted) {
    if (objectSelectedByLasso(obj, lasso)) {
      hit.push(obj);
    }
  }

  return hit;
}

export function getObjectsByIds(
  paths: PathObject[],
  images: ImageObject[],
  ids: readonly string[],
  texts: TextObject[] = [],
): SceneObject[] {
  if (ids.length === 0) return [];

  const idSet = new Set(ids);
  const result: SceneObject[] = [];

  for (const path of paths) {
    if (idSet.has(path.id)) result.push(path);
  }
  for (const image of images) {
    if (idSet.has(image.id)) result.push(image);
  }
  for (const text of texts) {
    if (idSet.has(text.id)) result.push(text);
  }

  return result;
}

function objectSelectedByLasso(obj: SceneObject, lasso: LassoPoint[]): boolean {
  if ('points' in obj) {
    if (obj.tool === 'eraser') return false;
    if (obj.tool === 'pencil' || obj.tool === 'pen') {
      return pathIntersectsLasso(obj, lasso);
    }
    return pathContainedInLasso(obj, lasso);
  }

  const local = getObjectLocalBounds(obj);
  const corners = [
    localToWorld(local.x, local.y, obj.transform),
    localToWorld(local.x + local.w, local.y, obj.transform),
    localToWorld(local.x, local.y + local.h, obj.transform),
    localToWorld(local.x + local.w, local.y + local.h, obj.transform),
  ];

  return corners.every((c) => pointInPolygon(c.x, c.y, lasso));
}

export function moveSceneObject(obj: SceneObject, dx: number, dy: number): void {
  obj.transform.cx += dx;
  obj.transform.cy += dy;
}

export function getSelectedObject(
  paths: PathObject[],
  images: ImageObject[],
  selectedId: string | null,
  texts: TextObject[] = [],
): SceneObject | null {
  if (!selectedId) return null;
  return (
    paths.find((p) => p.id === selectedId) ??
    images.find((i) => i.id === selectedId) ??
    texts.find((t) => t.id === selectedId) ??
    null
  );
}

export type LayerMove = 'front' | 'back' | 'forward' | 'backward';

function selectedIndices(sorted: SceneObject[], selectedIds: readonly string[]): number[] {
  const selected = new Set(selectedIds);
  const indices: number[] = [];
  sorted.forEach((obj, index) => {
    if (selected.has(obj.id)) indices.push(index);
  });
  return indices;
}

export function canApplyLayerMove(
  paths: PathObject[],
  images: ImageObject[],
  texts: TextObject[],
  selectedIds: readonly string[],
  move: LayerMove,
): boolean {
  if (selectedIds.length === 0) return false;

  const sorted = getSceneObjectsSorted(paths, images, texts);
  const indices = selectedIndices(sorted, selectedIds);
  if (indices.length === 0) return false;

  const minIdx = indices[0];
  const maxIdx = indices[indices.length - 1];

  switch (move) {
    case 'front':
    case 'forward':
      return maxIdx < sorted.length - 1;
    case 'back':
    case 'backward':
      return minIdx > 0;
  }
}

export function applyLayerMove(
  paths: PathObject[],
  images: ImageObject[],
  texts: TextObject[],
  selectedIds: readonly string[],
  move: LayerMove,
): boolean {
  if (!canApplyLayerMove(paths, images, texts, selectedIds, move)) return false;

  const sorted = getSceneObjectsSorted(paths, images, texts);
  const selected = new Set(selectedIds);
  const indices = selectedIndices(sorted, selectedIds);
  const minIdx = indices[0];
  const maxIdx = indices[indices.length - 1];
  const selectedObjs = sorted.filter((obj) => selected.has(obj.id));
  const nonSelected = sorted.filter((obj) => !selected.has(obj.id));

  let reordered: SceneObject[];

  switch (move) {
    case 'front':
      reordered = [...nonSelected, ...selectedObjs];
      break;
    case 'back':
      reordered = [...selectedObjs, ...nonSelected];
      break;
    case 'forward': {
      const before = sorted.slice(0, minIdx);
      const block = sorted.slice(minIdx, maxIdx + 1);
      const above = sorted.slice(maxIdx + 1, maxIdx + 2);
      const after = sorted.slice(maxIdx + 2);
      reordered = [...before, ...above, ...block, ...after];
      break;
    }
    case 'backward': {
      const before = sorted.slice(0, minIdx - 1);
      const below = sorted.slice(minIdx - 1, minIdx);
      const block = sorted.slice(minIdx, maxIdx + 1);
      const after = sorted.slice(maxIdx + 1);
      reordered = [...before, ...block, ...below, ...after];
      break;
    }
  }

  reordered.forEach((obj, index) => {
    obj.zIndex = index;
  });
  return true;
}
