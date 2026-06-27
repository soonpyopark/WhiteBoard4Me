import { useRef, type ReactNode } from 'react';
import type { Tool } from '../engine/types';
import { EraserOptionsPopover } from './EraserOptionsPopover';
import { TextOptionsPopover, type TextOptionsPopoverPlacement } from './TextOptionsPopover';
import { ToolOptionsPopover } from './ToolOptionsPopover';
import {
  isDrawSettingsTool,
  type DrawSettingsTool,
  type DrawToolSettings,
} from '../drawToolSettings';
import type { EraserSettings } from '../eraserSettings';
import type { TextToolSettings } from '../textToolSettings';

interface EditorToolStripProps {
  tool: Tool;
  drawSettings: DrawToolSettings;
  eraserSettings: EraserSettings;
  textSettings: TextToolSettings;
  drawOptionsOpen: boolean;
  textOptionsPlacement: TextOptionsPopoverPlacement;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: Tool) => void;
  onAttachImage?: () => void;
  onDrawSettingsChange: (patch: Partial<DrawToolSettings>) => void;
  onEraserSettingsChange: (patch: Partial<EraserSettings>) => void;
  onTextSettingsChange: (patch: Partial<TextToolSettings>) => void;
  onDrawOptionsClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

function UndoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 7H5.5C4.12 7 3 8.12 3 9.5V12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 4L3 7L6 10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 12C6 16.42 9.58 20 14 20C18.42 20 22 16.42 22 12C22 7.58 18.42 4 14 4H8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SelectIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 3.5v14.8l4.6-3.5 2.7 5.6 2.5-1.2-2.7-5.6 5.4-.5L4.5 3.5z"
        fill="#ffffff"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 7H18.5C19.88 7 21 8.12 21 9.5V12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 4L21 7L18 10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 12C18 16.42 14.42 20 10 20C5.58 20 2 16.42 2 12C2 7.58 5.58 4 10 4H16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageAttachIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="8.5" cy="10" r="1.75" fill="currentColor" />
      <path
        d="M3 16l5.5-5.5a1.5 1.5 0 012.12 0L14 14l2-2a1.5 1.5 0 012.12 0L21 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TextToolIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 5h12M12 5v14M9 19h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: 'text', label: '텍스트', icon: <TextToolIcon /> },
  { id: 'hand', label: '손 — 화면 이동', icon: '✋' },
  { id: 'select', label: '선택', icon: <SelectIcon /> },
  { id: 'lasso', label: '올가미', icon: '➰' },
  { id: 'pencil', label: '연필', icon: '✏️' },
  { id: 'pen', label: '볼펜', icon: '🖊️' },
  { id: 'highlighter', label: '형광펜', icon: '🖍️' },
  { id: 'eraser', label: '지우개', icon: '🧹' },
  { id: 'image', label: '사진 첨부', icon: <ImageAttachIcon /> },
];

export function EditorToolStrip({
  tool,
  drawSettings,
  eraserSettings,
  textSettings,
  drawOptionsOpen,
  textOptionsPlacement,
  canUndo,
  canRedo,
  onToolChange,
  onAttachImage,
  onDrawSettingsChange,
  onEraserSettingsChange,
  onTextSettingsChange,
  onDrawOptionsClose,
  onUndo,
  onRedo,
}: EditorToolStripProps) {
  const toolButtonRefs = useRef<Partial<Record<DrawSettingsTool, HTMLButtonElement | null>>>({});
  const drawAnchorRef = useRef<HTMLButtonElement | null>(null);
  const eraserAnchorRef = useRef<HTMLButtonElement | null>(null);
  const textAnchorRef = useRef<HTMLButtonElement | null>(null);
  const showEraserOptions = tool === 'eraser' && drawOptionsOpen;
  const showTextOptions = tool === 'text' && drawOptionsOpen && textOptionsPlacement === 'toolbar';

  return (
    <div className="editor-tool-strip" role="toolbar" aria-label="그리기 도구">
      <div className="history-group" role="group" aria-label="실행 취소">
        <button
          type="button"
          className="tool-btn tool-btn--icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="되돌리기 (Ctrl+Z)"
          aria-label="되돌리기"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="tool-btn tool-btn--icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="다시반영하기 (Ctrl+Y)"
          aria-label="다시반영하기"
        >
          <RedoIcon />
        </button>
      </div>

      <div className="toolbar-section toolbar-section--tools">
        <div className="tool-group" role="group" aria-label="Drawing tools">
          {TOOLS.map(({ id, label, icon }) => (
            <button
              key={id}
              ref={(el) => {
                if (isDrawSettingsTool(id)) {
                  toolButtonRefs.current[id] = el;
                  if (tool === id) drawAnchorRef.current = el;
                }
                if (id === 'eraser') {
                  if (tool === id) eraserAnchorRef.current = el;
                }
                if (id === 'text') {
                  textAnchorRef.current = el;
                }
              }}
              type="button"
              className={`tool-btn tool-btn--icon ${tool === id ? 'active' : ''}`}
              onClick={() => {
                if (id === 'image') {
                  onAttachImage?.();
                }
                onToolChange(id);
              }}
              title={label}
              aria-label={label}
              aria-pressed={tool === id}
            >
              <span className="tool-icon" aria-hidden="true">
                {icon}
              </span>
            </button>
          ))}
        </div>

        {isDrawSettingsTool(tool) && drawOptionsOpen && (
          <ToolOptionsPopover
            tool={tool}
            settings={drawSettings}
            onChange={onDrawSettingsChange}
            anchorRef={drawAnchorRef}
            onClose={onDrawOptionsClose}
          />
        )}

        {showEraserOptions && (
          <EraserOptionsPopover
            settings={eraserSettings}
            onChange={onEraserSettingsChange}
            anchorRef={eraserAnchorRef}
            onClose={onDrawOptionsClose}
          />
        )}

        {showTextOptions && (
          <TextOptionsPopover
            settings={textSettings}
            onChange={onTextSettingsChange}
            anchorRef={textAnchorRef}
            placement="toolbar"
            open={showTextOptions}
            onClose={onDrawOptionsClose}
          />
        )}
      </div>
    </div>
  );
}
