import type { StrokePoint } from './types';

export interface StylusSmoothState {
  pressure: number;
  x: number;
  y: number;
}

interface StylusInputProfile {
  /** 1 = 스무딩 없음, 낮을수록 부드럽고 약간 지연 */
  positionAlpha: number;
  pressureAlpha: number;
  pressureExponent: number;
  minPointDist: number;
  catmullSegments: number;
}

let cachedIsAppleStylusEnv: boolean | null = null;

/** iPad / iPhone Safari — Apple Pencil 노이즈가 XP-Pen 대비 큼 */
export function isAppleStylusEnvironment(): boolean {
  if (cachedIsAppleStylusEnv !== null) return cachedIsAppleStylusEnv;
  if (typeof navigator === 'undefined') {
    cachedIsAppleStylusEnv = false;
    return false;
  }
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  cachedIsAppleStylusEnv = isIOS;
  return isIOS;
}

function getStylusProfile(): StylusInputProfile {
  if (isAppleStylusEnvironment()) {
    return {
      positionAlpha: 0.4,
      pressureAlpha: 0.26,
      pressureExponent: 0.82,
      minPointDist: 0,
      catmullSegments: 8,
    };
  }
  return {
    positionAlpha: 1,
    pressureAlpha: 0.38,
    pressureExponent: 0.72,
    minPointDist: 0.35,
    catmullSegments: 6,
  };
}

export function getStylusCatmullSegments(): number {
  return getStylusProfile().catmullSegments;
}

export function stylusPressureCurve(raw: number, exponent?: number): number {
  const exp = exponent ?? getStylusProfile().pressureExponent;
  const clamped = Math.max(0.01, Math.min(1, raw));
  return Math.pow(clamped, exp);
}

function smoothStylusPressure(current: number, previous: number | null, alpha: number): number {
  if (previous === null) return current;
  return previous + alpha * (current - previous);
}

function smoothStylusPosition(
  x: number,
  y: number,
  previous: { x: number; y: number } | null,
  alpha: number,
): { x: number; y: number } {
  if (previous === null || alpha >= 1) return { x, y };
  return {
    x: previous.x + alpha * (x - previous.x),
    y: previous.y + alpha * (y - previous.y),
  };
}

function processStylusSample(
  rawPressure: number,
  pointerType: string,
  worldX: number,
  worldY: number,
  state: StylusSmoothState | null,
  profile: StylusInputProfile,
): { point: StrokePoint; state: StylusSmoothState | null } {
  if (pointerType !== 'pen' || rawPressure <= 0) {
    return {
      point: { x: worldX, y: worldY, pressure: rawPressure, pointerType },
      state: null,
    };
  }

  const pos = smoothStylusPosition(
    worldX,
    worldY,
    state ? { x: state.x, y: state.y } : null,
    profile.positionAlpha,
  );
  const curved = stylusPressureCurve(rawPressure, profile.pressureExponent);
  const pressure = smoothStylusPressure(
    curved,
    state?.pressure ?? null,
    profile.pressureAlpha,
  );
  const nextState: StylusSmoothState = { x: pos.x, y: pos.y, pressure };

  return {
    point: { x: pos.x, y: pos.y, pressure, pointerType },
    state: nextState,
  };
}

/** pointermove의 coalesced 샘플까지 포함해 StrokePoint 배열 생성 */
export function collectPointerStrokePoints(
  nativeEvent: PointerEvent,
  canvas: HTMLElement,
  screenToWorld: (x: number, y: number) => { x: number; y: number },
  lastState: StylusSmoothState | null,
): { points: StrokePoint[]; lastState: StylusSmoothState | null } {
  const profile = getStylusProfile();
  const events =
    typeof nativeEvent.getCoalescedEvents === 'function'
      ? nativeEvent.getCoalescedEvents()
      : [nativeEvent];

  const rect = canvas.getBoundingClientRect();
  let smoothState = lastState;
  const points: StrokePoint[] = [];

  for (const ev of events) {
    const screenX = ev.clientX - rect.left;
    const screenY = ev.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);
    const processed = processStylusSample(
      ev.pressure,
      ev.pointerType,
      world.x,
      world.y,
      smoothState,
      profile,
    );
    smoothState = processed.state;
    points.push(processed.point);
  }

  const thinned =
    profile.minPointDist > 0 ? thinStrokePoints(points, profile.minPointDist) : points;

  return { points: thinned, lastState: smoothState };
}

/** 데스크톱 성능용 — Apple Pencil 환경에서는 사용하지 않음 */
export function thinStrokePoints(points: StrokePoint[], minDist: number): StrokePoint[] {
  if (points.length <= 1 || minDist <= 0) return points;

  const out: StrokePoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = out[out.length - 1];
    if (Math.hypot(p.x - prev.x, p.y - prev.y) >= minDist) {
      out.push(p);
    }
  }

  const last = points[points.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last.x - tail.x, last.y - tail.y) > 0.01) {
    out.push(last);
  }

  return out;
}
