import { useEffect, useRef, useCallback } from 'react';
import type { DrawingEngine } from '../engine/drawingEngine';
import type { TextObject } from '../engine/types';
import { TEXT_PADDING } from '../engine/textRenderer';
import type { TextToolSettings } from '../textToolSettings';

export interface TextEditSession {
  id: string | null;
  topLeftX: number;
  topLeftY: number;
  draft: string;
}

interface TextEditorOverlayProps {
  session: TextEditSession;
  settings: TextToolSettings;
  engineRef: React.MutableRefObject<DrawingEngine | null>;
  editorRef?: React.RefObject<HTMLTextAreaElement | null>;
  optionsOpen?: boolean;
  onDraftChange: (draft: string) => void;
  onCommit: (draft: string) => void;
  onCancel: () => void;
}

export function TextEditorOverlay({
  session,
  settings,
  engineRef,
  editorRef,
  optionsOpen = false,
  onDraftChange,
  onCommit,
  onCancel,
}: TextEditorOverlayProps) {
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = editorRef ?? localTextareaRef;
  const suppressBlurUntilRef = useRef(0);

  useEffect(() => {
    suppressBlurUntilRef.current = performance.now() + 200;
    const frame = window.requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      if (session.id) {
        el.select();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [session.id, session.topLeftX, session.topLeftY]);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (performance.now() < suppressBlurUntilRef.current) return;
      if (optionsOpen) return;
      onCommit(e.currentTarget.value);
    },
    [onCommit, optionsOpen],
  );

  const engine = engineRef.current;
  if (!engine) return null;

  const scale = engine.getViewScale();
  const existing = session.id ? engine.getTextObject(session.id) : null;
  const fontFamily = existing?.fontFamily ?? settings.fontFamily;
  const fontSize = existing?.fontSize ?? settings.fontSize;
  const color = existing?.color ?? settings.color;
  const width = existing?.width ?? 240;
  const height = existing?.height ?? fontSize * 1.35 + TEXT_PADDING * 2;
  const screen = engine.worldToScreen(session.topLeftX, session.topLeftY);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onCommit(e.currentTarget.value);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      className="canvas-text-editor"
      value={session.draft}
      onChange={(e) => onDraftChange(e.target.value)}
      onBlur={handleBlur}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      style={{
        left: `${screen.x}px`,
        top: `${screen.y}px`,
        width: `${Math.max(width * scale, 120)}px`,
        minHeight: `${Math.max(height * scale, fontSize * scale * 1.35 + 16)}px`,
        fontFamily,
        fontSize: `${fontSize * scale}px`,
        color,
        lineHeight: 1.35,
      }}
      placeholder="텍스트 입력…"
      aria-label="텍스트 입력"
    />
  );
}

export function getTextTopLeft(text: TextObject): { x: number; y: number } {
  return {
    x: text.transform.cx - text.width / 2,
    y: text.transform.cy - text.height / 2,
  };
}
