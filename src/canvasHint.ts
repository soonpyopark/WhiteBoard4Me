import type { Tool } from './engine/types';

export function getCanvasHint(tool: Tool): string {
  if (tool === 'hand') {
    return '손 도구: 드래그하여 화이트보드 화면 이동';
  }

  if (tool === 'select') {
    return '선택: 클릭으로 객체 선택 · 드래그로 이동 · 개체에서 우클릭 또는 0.5초 길게 눌러 순서 변경';
  }

  if (tool === 'lasso') {
    return '올가미: 드래그로 영역 선택 · 개체에서 우클릭 또는 0.5초 길게 눌러 순서 변경';
  }

  if (tool === 'image') {
    return '사진 첨부: 클릭하여 이미지 파일 선택 · 드래그·붙여넣기도 가능';
  }

  if (tool === 'text') {
    return '텍스트: 클릭하여 입력 · 더블클릭으로 다시 편집 · Ctrl+Enter로 확정';
  }

  return 'Wacom, XP-Pen 등 펜 타블렛의 필압이 자동으로 반영됩니다 · 개체에서 우클릭 또는 0.5초 길게 눌러 순서 변경';
}
