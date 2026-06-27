import {
  ERASER_STROKE_PREVIEW_COLOR,
  ERASER_STROKE_PREVIEW_OPACITY,
} from '../eraserSettings';
import { pressureToWidth } from './pressure';
import { catmullRomSpline } from './smoothing';
import { isAppleStylusEnvironment } from './strokeInput';
import type { DrawingOptions, EraserMode, PathObject, StrokePoint, ToolPreset } from './types';
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function paintDab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  color: string,
  tool: PathObject['tool'],
  opacity: number,
  textured: boolean,
  seed: number,
  _eraserMode: EraserMode = 'partial',
): void {
  const radius = width / 2;
  ctx.save();

  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (textured && tool === 'pencil') {
    for (let j = 0; j < 2; j++) {
      const jitter = 0.35;
      const ox = (pseudoRandom(seed + j * 17.3) - 0.5) * width * jitter;
      const oy = (pseudoRandom(seed + j * 41.9) - 0.5) * width * jitter;
      ctx.globalAlpha = opacity * 0.35;
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

let strokeScratch: HTMLCanvasElement | null = null;
let strokeScratchCtx: CanvasRenderingContext2D | null = null;

function ensureStrokeScratch(width: number, height: number): CanvasRenderingContext2D | null {
  if (!strokeScratch) {
    strokeScratch = document.createElement('canvas');
    strokeScratchCtx = strokeScratch.getContext('2d');
  }
  if (!strokeScratchCtx) return null;

  if (strokeScratch.width < width || strokeScratch.height < height) {
    strokeScratch.width = Math.max(strokeScratch.width, width);
    strokeScratch.height = Math.max(strokeScratch.height, height);
  }

  return strokeScratchCtx;
}

function strokeBounds(
  points: StrokePoint[],
  pad: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

/** Draw opaque stroke to scratch, then composite once — avoids alpha stacking at joints. */
function renderHighlighterStroke(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  color: string,
  opacity: number,
  lineWidth: number,
): void {
  if (points.length === 0) return;

  const pad = lineWidth / 2 + 2;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const scratchW = Math.ceil(maxX - minX + pad * 2);
  const scratchH = Math.ceil(maxY - minY + pad * 2);
  if (scratchW <= 0 || scratchH <= 0) return;

  const scratchCtx = ensureStrokeScratch(scratchW, scratchH);
  if (!scratchCtx || !strokeScratch) return;

  scratchCtx.save();
  scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
  scratchCtx.clearRect(0, 0, scratchW, scratchH);
  scratchCtx.globalCompositeOperation = 'source-over';
  scratchCtx.globalAlpha = 1;
  scratchCtx.strokeStyle = color;
  scratchCtx.fillStyle = color;
  scratchCtx.lineCap = 'round';
  scratchCtx.lineJoin = 'round';
  scratchCtx.lineWidth = lineWidth;

  const ox = minX - pad;
  const oy = minY - pad;

  if (points.length === 1) {
    scratchCtx.beginPath();
    scratchCtx.arc(points[0].x - ox, points[0].y - oy, lineWidth / 2, 0, Math.PI * 2);
    scratchCtx.fill();
  } else {
    scratchCtx.beginPath();
    scratchCtx.moveTo(points[0].x - ox, points[0].y - oy);
    for (let i = 1; i < points.length; i++) {
      scratchCtx.lineTo(points[i].x - ox, points[i].y - oy);
    }
    scratchCtx.stroke();
  }

  scratchCtx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = opacity;
  ctx.drawImage(strokeScratch, 0, 0, scratchW, scratchH, ox, oy, scratchW, scratchH);
  ctx.restore();
}

function renderPencilStroke(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  color: string,
  opacity: number,
  baseWidth: number,
  minWidth: number,
  maxWidth: number,
  textured: boolean,
): void {
  if (points.length === 0) return;

  const widthAt = (p: StrokePoint) => pressureToWidth(p, baseWidth, minWidth, maxWidth);
  const pad = maxWidth / 2 + 2;
  const { minX, minY, maxX, maxY } = strokeBounds(points, pad);
  const scratchW = Math.ceil(maxX - minX);
  const scratchH = Math.ceil(maxY - minY);
  if (scratchW <= 0 || scratchH <= 0) return;

  const scratchCtx = ensureStrokeScratch(scratchW, scratchH);
  if (!scratchCtx || !strokeScratch) return;

  scratchCtx.save();
  scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
  scratchCtx.clearRect(0, 0, scratchW, scratchH);
  scratchCtx.globalCompositeOperation = 'source-over';
  scratchCtx.globalAlpha = 1;
  scratchCtx.strokeStyle = color;
  scratchCtx.fillStyle = color;
  scratchCtx.lineCap = 'round';
  scratchCtx.lineJoin = 'round';

  if (points.length === 1) {
    const w = widthAt(points[0]);
    scratchCtx.beginPath();
    scratchCtx.arc(points[0].x - minX, points[0].y - minY, w / 2, 0, Math.PI * 2);
    scratchCtx.fill();
  } else {
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1];
      const to = points[i];
      scratchCtx.lineWidth = (widthAt(from) + widthAt(to)) / 2;
      scratchCtx.beginPath();
      scratchCtx.moveTo(from.x - minX, from.y - minY);
      scratchCtx.lineTo(to.x - minX, to.y - minY);
      scratchCtx.stroke();
    }
  }

  if (textured && points.length > 1) {
    scratchCtx.fillStyle = color;
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1];
      const to = points[i];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy);
      const grainStep = 1.5;
      const grains = Math.max(1, Math.ceil(dist / grainStep));
      const wFrom = widthAt(from);
      const wTo = widthAt(to);

      for (let g = 0; g <= grains; g++) {
        const t = g / grains;
        if (pseudoRandom(i * 1000 + g) > 0.45) continue;

        const x = from.x + dx * t - minX;
        const y = from.y + dy * t - minY;
        const w = wFrom + (wTo - wFrom) * t;
        const jitter = 0.35;
        const seed = i * 1000 + g;
        const ox = (pseudoRandom(seed + 17.3) - 0.5) * w * jitter;
        const oy = (pseudoRandom(seed + 41.9) - 0.5) * w * jitter;

        scratchCtx.globalAlpha = 0.22;
        scratchCtx.beginPath();
        scratchCtx.arc(x + ox, y + oy, Math.max(0.4, w * 0.18), 0, Math.PI * 2);
        scratchCtx.fill();
      }
    }
  }

  scratchCtx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = opacity;
  ctx.drawImage(strokeScratch, 0, 0, scratchW, scratchH, minX, minY, scratchW, scratchH);
  ctx.restore();
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  from: StrokePoint,
  to: StrokePoint,
  path: PathObject,
  seedBase: number,
): void {
  const widthFrom = pressureToWidth(from, path.baseWidth, path.minWidth, path.maxWidth);
  const widthTo = pressureToWidth(to, path.baseWidth, path.minWidth, path.maxWidth);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(1, Math.min(dist, 3));
  const steps = Math.ceil(dist / step);

  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = from.x + dx * t;
    const y = from.y + dy * t;
    const w = widthFrom + (widthTo - widthFrom) * t;
    paintDab(
      ctx,
      x,
      y,
      w,
      path.color,
      path.tool,
      path.opacity,
      path.textured,
      seedBase + i,
    );
  }
}

export function renderPath(ctx: CanvasRenderingContext2D, path: PathObject): void {
  const { transform } = path;
  ctx.save();
  ctx.translate(transform.cx, transform.cy);
  ctx.rotate(transform.rotation);
  ctx.scale(transform.scale, transform.scale);

  if (path.tool === 'highlighter') {
    renderHighlighterStroke(ctx, path.points, path.color, path.opacity, path.baseWidth);
    ctx.restore();
    return;
  }

  if (path.tool === 'pencil') {
    renderPencilStroke(
      ctx,
      path.points,
      path.color,
      path.opacity,
      path.baseWidth,
      path.minWidth,
      path.maxWidth,
      path.textured,
    );
    ctx.restore();
    return;
  }

  if (path.points.length === 1) {
    const p = path.points[0];
    const w = pressureToWidth(p, path.baseWidth, path.minWidth, path.maxWidth);
    paintDab(ctx, p.x, p.y, w, path.color, path.tool, path.opacity, path.textured, 0);
    ctx.restore();
    return;
  }

  for (let i = 1; i < path.points.length; i++) {
    drawSegment(ctx, path.points[i - 1], path.points[i], path, i * 1000);
  }

  renderLineEnds(ctx, path);

  ctx.restore();
}

function segmentAngle(from: StrokePoint, to: StrokePoint): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  path: PathObject,
): void {
  ctx.save();

  if (path.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = path.color;
    ctx.globalAlpha = path.opacity;
  }

  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.45);
  ctx.lineTo(-size, size * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderLineEnds(ctx: CanvasRenderingContext2D, path: PathObject): void {
  const lineEnd = path.lineEnd ?? 'plain';
  if (lineEnd === 'plain' || path.points.length < 2) return;

  const last = path.points.length - 1;
  const headSize = Math.max(8, path.baseWidth * 2.5);

  if (lineEnd === 'arrow-end' || lineEnd === 'arrow-both') {
    drawArrowHead(
      ctx,
      path.points[last].x,
      path.points[last].y,
      segmentAngle(path.points[last - 1], path.points[last]),
      headSize,
      path,
    );
  }

  if (lineEnd === 'arrow-both') {
    drawArrowHead(
      ctx,
      path.points[0].x,
      path.points[0].y,
      segmentAngle(path.points[1], path.points[0]),
      headSize,
      path,
    );
  }
}

/** 드로잉 중 실시간 프리뷰용 — 최종 저장보다 가벼운 스무딩 */
function liveSmoothPoints(points: StrokePoint[], segments = 4): StrokePoint[] {
  if (points.length <= 1) return [...points];
  const apple = isAppleStylusEnvironment();
  const twoPointSegments = apple ? 8 : 6;
  const multiSegments = apple ? Math.max(segments, 6) : segments;
  if (points.length === 2) return catmullRomSpline(points, twoPointSegments);
  return catmullRomSpline(points, multiSegments);
}

/** 드로잉 중 실시간 프리뷰용 */
export function renderLiveStroke(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  options: DrawingOptions,
  preset: ToolPreset,
): void {
  const eraserMode = options.eraserMode ?? 'partial';
  const fakePath: PathObject = {
    id: '',
    points,
    tool: options.tool,
    color: options.color,
    baseWidth: options.baseWidth,
    minWidth: options.minWidth,
    maxWidth: options.maxWidth,
    opacity: options.opacity,
    textured: preset.textured,
    lineEnd: options.lineEnd,
    transform: { cx: 0, cy: 0, rotation: 0, scale: 1 },
  };

  const { transform } = fakePath;
  ctx.save();
  ctx.translate(transform.cx, transform.cy);
  ctx.rotate(transform.rotation);
  ctx.scale(transform.scale, transform.scale);

  if (fakePath.tool === 'highlighter') {
    renderHighlighterStroke(
      ctx,
      liveSmoothPoints(fakePath.points),
      fakePath.color,
      fakePath.opacity,
      fakePath.baseWidth,
    );
    ctx.restore();
    return;
  }

  if (fakePath.tool === 'eraser' && eraserMode === 'stroke') {
    renderHighlighterStroke(
      ctx,
      liveSmoothPoints(fakePath.points),
      ERASER_STROKE_PREVIEW_COLOR,
      ERASER_STROKE_PREVIEW_OPACITY,
      fakePath.baseWidth,
    );
    ctx.restore();
    return;
  }

  if (fakePath.tool === 'pencil') {
    renderPencilStroke(
      ctx,
      liveSmoothPoints(fakePath.points),
      fakePath.color,
      fakePath.opacity,
      fakePath.baseWidth,
      fakePath.minWidth,
      fakePath.maxWidth,
      false,
    );
    ctx.restore();
    return;
  }

  const penPoints =
    fakePath.tool === 'pen' ? liveSmoothPoints(fakePath.points, 5) : fakePath.points;

  if (penPoints.length === 1) {
    const p = penPoints[0];
    const w = pressureToWidth(p, fakePath.baseWidth, fakePath.minWidth, fakePath.maxWidth);
    paintDab(
      ctx,
      p.x,
      p.y,
      w,
      fakePath.color,
      fakePath.tool,
      fakePath.opacity,
      fakePath.textured,
      0,
      eraserMode,
    );
    ctx.restore();
    return;
  }

  for (let i = 1; i < penPoints.length; i++) {
    const from = penPoints[i - 1];
    const to = penPoints[i];
    const widthFrom = pressureToWidth(from, fakePath.baseWidth, fakePath.minWidth, fakePath.maxWidth);
    const widthTo = pressureToWidth(to, fakePath.baseWidth, fakePath.minWidth, fakePath.maxWidth);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(1, Math.min(dist, 3));
    const steps = Math.ceil(dist / step);

    for (let j = 0; j <= steps; j++) {
      const t = steps === 0 ? 0 : j / steps;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      const w = widthFrom + (widthTo - widthFrom) * t;
      paintDab(
        ctx,
        x,
        y,
        w,
        fakePath.color,
        fakePath.tool,
        fakePath.opacity,
        fakePath.textured,
        i * 1000 + j,
        eraserMode,
      );
    }
  }

  ctx.restore();
}
