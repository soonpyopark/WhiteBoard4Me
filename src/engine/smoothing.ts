import type { StrokePoint } from './types';

/** Catmull-Rom 스플라인으로 부드러운 보간 포인트 생성 */
export function catmullRomSpline(
  points: StrokePoint[],
  segmentsPerSpan = 8,
): StrokePoint[] {
  if (points.length < 2) return [...points];
  if (points.length === 2) {
    return interpolateLinear(points[0], points[1], segmentsPerSpan);
  }

  const result: StrokePoint[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let t = 1; t <= segmentsPerSpan; t++) {
      const s = t / segmentsPerSpan;
      result.push(catmullRomPoint(p0, p1, p2, p3, s));
    }
  }

  return result;
}

function catmullRomPoint(
  p0: StrokePoint,
  p1: StrokePoint,
  p2: StrokePoint,
  p3: StrokePoint,
  t: number,
): StrokePoint {
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  const pressure = p1.pressure + (p2.pressure - p1.pressure) * t;

  return { x, y, pressure, pointerType: p1.pointerType };
}

function interpolateLinear(
  a: StrokePoint,
  b: StrokePoint,
  steps: number,
): StrokePoint[] {
  const result: StrokePoint[] = [a];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    result.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      pressure: a.pressure + (b.pressure - a.pressure) * t,
      pointerType: a.pointerType,
    });
  }
  return result;
}
