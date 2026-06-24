import { useEffect, useRef, useState } from 'react';
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

export function TextOptionsPopover({
  settings,
  onChange,
  anchorRef,
  placement,
  open,
  onClose,
}: TextOptionsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ left: number; top: number; transform?: string }>({
    left: 0,
    top: 0,
  });

  useEffect(() => {
    if (!open) return;

    const anchor = anchorRef.current;
    if (!anchor) return;

    const padding = 8;
    const gap = 8;

    const updatePosition = () => {
      const currentAnchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!currentAnchor) return;

      const rect = currentAnchor.getBoundingClientRect();

      const popoverWidth = popover?.offsetWidth ?? 260;
      const popoverHeight = popover?.offsetHeight ?? 320;

      let centerX = rect.left + rect.width / 2;
      let top = rect.bottom + gap;

      const halfW = popoverWidth / 2;
      centerX = Math.max(padding + halfW, Math.min(window.innerWidth - padding - halfW, centerX));

      if (top + popoverHeight > window.innerHeight - padding) {
        const aboveTop = rect.top - popoverHeight - gap;
        top = aboveTop >= padding ? aboveTop : Math.max(padding, window.innerHeight - popoverHeight - padding);
      }

      setStyle({
        left: centerX,
        top,
        transform: 'translateX(-50%)',
      });
    };

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);

    const observer =
      placement === 'editor' && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updatePosition)
        : null;
    observer?.observe(anchor);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, open, placement, settings.fontSize]);

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

  if (!open) return null;

  const keepEditorFocus = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'LABEL') return;
    if (target.closest('label')) return;
    e.preventDefault();
  };

  return (
    <div
      ref={popoverRef}
      className={`tool-options-popover text-options-popover ${placement === 'editor' ? 'text-options-popover--editor' : ''}`}
      style={{
        left: style.left,
        top: style.top,
        transform: style.transform,
      }}
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
          <input
            id="text-font-family-custom"
            type="text"
            className="text-options-input"
            value={settings.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            placeholder="PC 글꼴 이름 (예: 나눔고딕, Times New Roman)"
            spellCheck={false}
            aria-label="PC에 설치된 글꼴 이름"
          />
          <p className="text-options-font-hint">폰트 파일은 배포에 포함되지 않습니다. PC에 설치된 글꼴만 사용됩니다.</p>
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
            onClick={() => onChange({ color: c })}
            title={c}
            aria-label={`색상 ${c}`}
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
    </div>
  );
}
