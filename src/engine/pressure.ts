import type { StrokePoint } from './types';
import { isAppleStylusEnvironment } from './strokeInput';

/** 마우스 등 필압 미지원 입력인지 판별 */
export function hasPressureSupport(point: StrokePoint): boolean {
  if (point.pointerType === 'mouse' || point.pointerType === 'touch') {
    return false;
  }
  // 펜: pressure 0은 공중 호버, 0~1은 실제 필압
  return point.pointerType === 'pen' && point.pressure > 0;
}

/** 필압 → 선 굵기 (px). 필압 없으면 baseWidth 사용 */
export function pressureToWidth(
  point: StrokePoint,
  baseWidth: number,
  minWidth: number,
  maxWidth: number,
): number {
  if (!hasPressureSupport(point)) {
    return baseWidth;
  }
  const t = Math.max(0, Math.min(1, point.pressure));
  let width = minWidth + t * (maxWidth - minWidth);

  // Apple Pencil 필압 변화폭이 커서 선 굵기 떨림이 두드러짐
  if (isAppleStylusEnvironment()) {
    width = baseWidth + (width - baseWidth) * 0.5;
  }

  return width;
}
