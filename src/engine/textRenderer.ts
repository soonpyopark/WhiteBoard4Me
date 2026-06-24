import type { TextObject } from './types';

export const TEXT_LINE_HEIGHT = 1.35;
export const TEXT_MIN_WIDTH = 160;
export const TEXT_PADDING = 8;

export function buildTextFont(fontSize: number, fontFamily: string): string {
  return `${fontSize}px ${fontFamily}`;
}

export function measureTextContent(
  content: string,
  fontFamily: string,
  fontSize: number,
  minWidth = TEXT_MIN_WIDTH,
): { width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { width: minWidth, height: fontSize * TEXT_LINE_HEIGHT + TEXT_PADDING * 2 };
  }

  ctx.font = buildTextFont(fontSize, fontFamily);
  const lines = content.split('\n');
  const lineHeightPx = fontSize * TEXT_LINE_HEIGHT;
  let maxLineWidth = 0;

  for (const line of lines) {
    maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line || ' ').width);
  }

  const width = Math.ceil(Math.max(minWidth, maxLineWidth + TEXT_PADDING * 2));
  const height = Math.ceil(Math.max(lineHeightPx, lines.length * lineHeightPx) + TEXT_PADDING * 2);
  return { width, height };
}

export function applyTextDimensions(text: TextObject): void {
  const { width, height } = measureTextContent(text.content, text.fontFamily, text.fontSize);
  text.width = width;
  text.height = height;
}

export function renderText(ctx: CanvasRenderingContext2D, text: TextObject): void {
  const { transform, fontSize, fontFamily, color, content, lineHeight } = text;

  ctx.save();
  ctx.translate(transform.cx, transform.cy);
  ctx.rotate(transform.rotation);
  ctx.scale(transform.scale, transform.scale);

  ctx.font = buildTextFont(fontSize, fontFamily);
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  const lines = content.split('\n');
  const lineHeightPx = fontSize * lineHeight;
  const startX = -text.width / 2 + TEXT_PADDING;
  const startY = -text.height / 2 + TEXT_PADDING;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], startX, startY + i * lineHeightPx);
  }

  ctx.restore();
}
