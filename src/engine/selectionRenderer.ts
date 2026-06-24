import { getHandlePositions } from './hitTest';
import { getObjectLocalBounds } from './sceneObject';
import { localToWorld } from './pathObject';
import type { LassoPoint, SceneObject } from './types';
import { HANDLE_RADIUS } from './types';

export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  obj: SceneObject,
): void {
  const local = getObjectLocalBounds(obj);
  const corners = [
    localToWorld(local.x, local.y, obj.transform),
    localToWorld(local.x + local.w, local.y, obj.transform),
    localToWorld(local.x + local.w, local.y + local.h, obj.transform),
    localToWorld(local.x, local.y + local.h, obj.transform),
  ];

  ctx.save();
  ctx.strokeStyle = '#4a6cf7';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  const handles = getHandlePositions(obj);
  const rotateHandle = handles.find((h) => h.id === 'rotate');
  const topMid = localToWorld(local.x + local.w / 2, local.y, obj.transform);

  if (rotateHandle) {
    ctx.strokeStyle = '#4a6cf7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(topMid.x, topMid.y);
    ctx.lineTo(rotateHandle.x, rotateHandle.y);
    ctx.stroke();
  }

  for (const h of handles) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4a6cf7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(h.x, h.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function renderLasso(ctx: CanvasRenderingContext2D, points: LassoPoint[]): void {
  if (points.length < 2) return;

  ctx.save();
  ctx.fillStyle = 'rgba(74, 108, 247, 0.08)';
  ctx.strokeStyle = '#4a6cf7';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (points.length >= 3) {
    ctx.closePath();
    ctx.fill();
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function renderDropOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(74, 108, 247, 0.06)';
  ctx.strokeStyle = '#4a6cf7';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(4, 4, width - 8, height - 8);
  ctx.setLineDash([]);
  ctx.restore();
}
