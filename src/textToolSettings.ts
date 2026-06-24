import type { TextObject } from './engine/types';
import { MAIN_COLOR_PALETTE } from './drawToolSettings';

export interface TextToolSettings {
  fontFamily: string;
  fontSize: number;
  color: string;
}

/** CSS font-family 값. exe/웹 빌드에 폰트 파일은 포함되지 않으며, 사용자 PC에 설치된 글꼴만 사용됩니다. */
export const TEXT_FONT_OPTIONS = [
  { id: 'Malgun Gothic, sans-serif', label: '맑은 고딕' },
  { id: 'Apple SD Gothic Neo, Malgun Gothic, sans-serif', label: '고딕' },
  { id: 'Batang, serif', label: '바탕' },
  { id: 'Gulim, sans-serif', label: '굴림' },
  { id: 'Georgia, serif', label: '세리프' },
  { id: 'Arial, sans-serif', label: 'Arial' },
  { id: 'Courier New, monospace', label: '고정폭' },
  { id: 'Comic Sans MS, cursive', label: '손글씨' },
] as const;

export function isPresetTextFont(fontFamily: string): boolean {
  return TEXT_FONT_OPTIONS.some((option) => option.id === fontFamily);
}

export const DEFAULT_TEXT_TOOL_SETTINGS: TextToolSettings = {
  fontFamily: 'Malgun Gothic, sans-serif',
  fontSize: 24,
  color: '#1a1a2e',
};

export { MAIN_COLOR_PALETTE };

export function settingsFromText(text: TextObject): TextToolSettings {
  return {
    fontFamily: text.fontFamily,
    fontSize: text.fontSize,
    color: text.color,
  };
}
