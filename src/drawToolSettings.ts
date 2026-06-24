import type { DrawTool, LineEndStyle, PathObject } from './engine/types';

export interface DrawToolSettings {
  thickness: number;
  opacity: number;
  color: string;
  lineEnd: LineEndStyle;
}

export type DrawSettingsTool = Extract<DrawTool, 'pencil' | 'pen' | 'highlighter'>;

export const DRAW_SETTINGS_TOOLS: DrawSettingsTool[] = ['pencil', 'pen', 'highlighter'];

export function isDrawSettingsTool(tool: string): tool is DrawSettingsTool {
  return DRAW_SETTINGS_TOOLS.includes(tool as DrawSettingsTool);
}

export const DEFAULT_DRAW_TOOL_SETTINGS: Record<DrawSettingsTool, DrawToolSettings> = {
  pencil: { thickness: 2, opacity: 60, color: '#1a1a2e', lineEnd: 'plain' },
  pen: { thickness: 3, opacity: 100, color: '#1a1a2e', lineEnd: 'plain' },
  highlighter: { thickness: 4, opacity: 45, color: '#fff176', lineEnd: 'plain' },
};

/** 4×4 기본 팔레트 (15색 + 우하단 사용자 색상 선택) */
export const MAIN_COLOR_PALETTE = [
  '#4a4a4a',
  '#ffeb3b',
  '#ff9800',
  '#ff5722',
  '#e53935',
  '#e91e63',
  '#d81b60',
  '#9c27b0',
  '#ba68c8',
  '#00bcd4',
  '#1976d2',
  '#8bc34a',
  '#388e3c',
  '#bdbdbd',
  '#ffffff',
] as const;

export const QUICK_COLORS = ['#000000', '#388e3c'] as const;

export function thicknessToWidths(
  tool: DrawTool,
  thickness: number,
): { baseWidth: number; minWidth: number; maxWidth: number } {
  const t = Math.min(6, Math.max(1, thickness));
  if (tool === 'highlighter') {
    const baseWidth = 10 + t * 2.5;
    return { baseWidth, minWidth: baseWidth * 0.85, maxWidth: baseWidth * 1.15 };
  }
  return {
    baseWidth: t,
    minWidth: Math.max(0.5, t * 0.4),
    maxWidth: t * 2,
  };
}

export function widthsToThickness(tool: DrawTool, path: PathObject): number {
  if (tool === 'highlighter') {
    return Math.min(6, Math.max(1, Math.round((path.baseWidth - 10) / 2.5)));
  }
  return Math.min(6, Math.max(1, Math.round(path.baseWidth)));
}

export function settingsFromPath(path: PathObject): DrawToolSettings {
  const tool = path.tool as DrawSettingsTool;
  return {
    thickness: widthsToThickness(tool, path),
    opacity: Math.round(path.opacity * 100),
    color: path.color,
    lineEnd: path.lineEnd ?? 'plain',
  };
}

export function drawSettingsToOptions(
  tool: DrawTool,
  settings: DrawToolSettings,
): {
  color: string;
  baseWidth: number;
  minWidth: number;
  maxWidth: number;
  opacity: number;
  lineEnd: LineEndStyle;
} {
  const widths = thicknessToWidths(tool, settings.thickness);
  return {
    color: settings.color,
    ...widths,
    opacity: Math.min(100, Math.max(0, settings.opacity)) / 100,
    lineEnd: settings.lineEnd,
  };
}
