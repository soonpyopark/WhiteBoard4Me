import type { EraserMode } from '../shared/drawing';

export type { EraserMode };

export interface EraserSettings {
  mode: EraserMode;
}

export const DEFAULT_ERASER_SETTINGS: EraserSettings = {
  mode: 'partial',
};

export const ERASER_MODE_OPTIONS: { id: EraserMode; label: string; description: string }[] = [
  { id: 'partial', label: '부분 지우기', description: '지우개가 지나간 부분만 지웁니다' },
  { id: 'stroke', label: '획 지우기', description: '지우개 경로에 닿은 획 전체를 삭제합니다' },
];
