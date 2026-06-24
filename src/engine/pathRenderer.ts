import { pressureToWidth } from './pressure';
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
  eraserMode: EraserMode = 'partial',
): void {
  const radius = width / 2;
  ctx.save();

  if (tool === 'eraser') {
    if (eraserMode === 'stroke') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(120, 120, 120, 0.35)';
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    }
  } else if (tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
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
  } else if (path.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = path.color;
    ctx.globalAlpha = path.opacity;
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

  if (fakePath.points.length === 1) {
    const p = fakePath.points[0];
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

  for (let i = 1; i < fakePath.points.length; i++) {
    const from = fakePath.points[i - 1];
    const to = fakePath.points[i];
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
