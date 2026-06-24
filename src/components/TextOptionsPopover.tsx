import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredPopoverPosition } from '../hooks/useAnchoredPopoverPosition';
import {
  isPresetTextFont,
  MAIN_COLOR_PALETTE,
  TEXT_FONT_OPTIONS,
  type TextToolSettings,
} from '../textToolSettings';

export type TextOptionsPopoverPlacement = 'toolbar' | 'editor';

interface TextOptionsPopoverProps {
  settings: TextToolSettings;
  onChange: (patch: Partial<TextToolSettings>) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement: TextOptionsPopoverPlacement;
  open: boolean;
  onClose: () => void;
}

function swatchStyle(color: string): React.CSSProperties {
  return color === '#ffffff'
    ? { backgroundColor: color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }
    : { backgroundColor: color };
}

function sliderFill(value: number, min: number, max: number): string {
  return `${((value - min) / (max - min)) * 100}%`;
}

const LONG_PRESS_MS = 500;

export function TextOptionsPopover({
  settings,
  onChange,
  anchorRef,
  placement,
  open,
  onClose,
}: TextOptionsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const popoverStyle = useAnchoredPopoverPosition(anchorRef, popoverRef, open, [settings.fontSize], {
    fallbackWidth: 260,
    fallbackHeight: 320,
  });

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const getColorSwatchHandlers = useCallback(
    (color: string) => ({
      onClick: () => {
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }
        onChange({ color });
      },
      onDoubleClick: () => {
        onChange({ color });
        onClose();
      },
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        longPressTriggeredRef.current = false;
        clearLongPressTimer();
        longPressTimerRef.current = window.setTimeout(() => {
          longPressTimerRef.current = null;
          longPressTriggeredRef.current = true;
          onChange({ color });
          onClose();
        }, LONG_PRESS_MS);
      },
      onPointerUp: () => clearLongPressTimer(),
      onPointerCancel: () => clearLongPressTimer(),
      onPointerLeave: () => clearLongPressTimer(),
    }),
    [clearLongPressTimer, onChange, onClose],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      const el = target as Element;
      if (el.closest?.('.canvas-text-editor, .drawing-canvas, .canvas-container')) return;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (placement === 'editor') {
        e.stopPropagation();
      }
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorRef, onClose, open, placement]);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  if (!open) return null;

  const keepEditorFocus = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'LABEL') return;
    if (target.closest('label')) return;
    e.preventDefault();
  };

  return createPortal(
    <div
      ref={popoverRef}
      className={`tool-options-popover text-options-popover ${placement === 'editor' ? 'text-options-popover--editor' : ''}`}
      style={popoverStyle}
      role="dialog"
      aria-label="텍스트 옵션"
      onMouseDown={placement === 'editor' ? keepEditorFocus : undefined}
    >
      <div className="tool-options-row text-options-font-row">
        <label className="text-options-label" htmlFor="text-font-family">
          글꼴
        </label>
        <div className="text-options-font-fields">
          <select
            id="text-font-family"
            className="text-options-select"
            value={isPresetTextFont(settings.fontFamily) ? settings.fontFamily : ''}
            onChange={(e) => {
              if (e.target.value) onChange({ fontFamily: e.target.value });
            }}
          >
            <option value="">자주 쓰는 글꼴…</option>
            {TEXT_FONT_OPTIONS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tool-options-row">
        <label className="text-options-label" htmlFor="text-font-size">
          크기
        </label>
        <div
          className="tool-options-slider-track"
          style={
            {
              '--fill': sliderFill(settings.fontSize, 12, 72),
              '--track-color': settings.color,
            } as React.CSSProperties
          }
        >
          <input
            id="text-font-size"
            type="range"
            min={12}
            max={72}
            step={1}
            value={settings.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="tool-options-slider"
            aria-label="글자 크기"
          />
        </div>
        <span className="tool-options-value">{settings.fontSize}</span>
      </div>

      <div className="tool-options-palette">
        {MAIN_COLOR_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            className={`tool-options-color ${settings.color === c ? 'active' : ''}`}
            style={swatchStyle(c)}
            title={c}
            aria-label={`색상 ${c}`}
            aria-pressed={settings.color === c}
            {...getColorSwatchHandlers(c)}
          />
        ))}
        <label className="tool-options-color tool-options-color--picker" title="사용자 색상">
          <input
            type="color"
            value={settings.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="tool-options-hidden-color"
          />
          <span className="tool-options-picker-icon" aria-hidden="true">
            🎨
          </span>
        </label>
      </div>
    </div>,
    document.body,
  );
}
