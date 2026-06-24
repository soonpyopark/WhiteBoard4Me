import { useEffect, useRef, useState } from 'react';
import type { LineEndStyle } from '../engine/types';
import { MAIN_COLOR_PALETTE, QUICK_COLORS, type DrawToolSettings } from '../drawToolSettings';

interface ToolOptionsPopoverProps {
  settings: DrawToolSettings;
  onChange: (patch: Partial<DrawToolSettings>) => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function PlainLineIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true">
      <line
        x1="3"
        y1="8"
        x2="25"
        y2="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {active && (
        <rect x="1" y="1" width="26" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      )}
    </svg>
  );
}

function ArrowEndIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true">
      <line x1="3" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 4 L25 8 L20 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {active && (
        <rect x="1" y="1" width="26" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      )}
    </svg>
  );
}

function ArrowBothIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true">
      <line x1="8" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 4 L3 8 L8 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 4 L25 8 L20 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {active && (
        <rect x="1" y="1" width="26" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      )}
    </svg>
  );
}

const LINE_END_OPTIONS: { id: LineEndStyle; label: string; Icon: typeof PlainLineIcon }[] = [
  { id: 'plain', label: '일반 선', Icon: PlainLineIcon },
  { id: 'arrow-end', label: '한쪽 화살표', Icon: ArrowEndIcon },
  { id: 'arrow-both', label: '양쪽 화살표', Icon: ArrowBothIcon },
];

function swatchStyle(color: string): React.CSSProperties {
  return color === '#ffffff'
    ? { backgroundColor: color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }
    : { backgroundColor: color };
}

export function ToolOptionsPopover({ settings, onChange, anchorRef, onClose }: ToolOptionsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const [style, setStyle] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      setStyle({
        left: rect.left + rect.width / 2,
        top: rect.bottom + 8,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [anchorRef, onClose]);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    const handleFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (!next) return;
      if (popover.contains(next)) return;
      if (anchorRef.current?.contains(next)) return;
      onClose();
    };

    popover.addEventListener('focusout', handleFocusOut);
    return () => popover.removeEventListener('focusout', handleFocusOut);
  }, [anchorRef, onClose]);

  const sliderFill = (value: number, min: number, max: number) =>
    `${((value - min) / (max - min)) * 100}%`;

  return (
    <div
      ref={popoverRef}
      className="tool-options-popover"
      style={{ left: style.left, top: style.top }}
      role="dialog"
      aria-label="도구 설정"
    >
      <div className="tool-options-row">
        <div
          className="tool-options-slider-track"
          style={
            {
              '--fill': sliderFill(settings.thickness, 1, 6),
              '--track-color': settings.color,
            } as React.CSSProperties
          }
        >
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={settings.thickness}
            onChange={(e) => onChange({ thickness: Number(e.target.value) })}
            className="tool-options-slider"
            aria-label="굵기"
          />
        </div>
        <span className="tool-options-value">{settings.thickness}</span>
      </div>

      <div className="tool-options-row">
        <div
          className="tool-options-slider-track tool-options-slider-track--opacity"
          style={
            {
              '--fill': sliderFill(settings.opacity, 0, 100),
              '--track-color': settings.color,
            } as React.CSSProperties
          }
        >
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={settings.opacity}
            onChange={(e) => onChange({ opacity: Number(e.target.value) })}
            className="tool-options-slider"
            aria-label="투명도"
          />
        </div>
        <input
          type="number"
          min={0}
          max={100}
          value={settings.opacity}
          onChange={(e) => {
            const next = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(next)) onChange({ opacity: Math.min(100, Math.max(0, next)) });
          }}
          className="tool-options-number"
          aria-label="투명도 퍼센트"
        />
      </div>

      <div className="tool-options-line-ends" role="group" aria-label="선 끝 모양">
        {LINE_END_OPTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`tool-options-line-end ${settings.lineEnd === id ? 'active' : ''}`}
            onClick={() => onChange({ lineEnd: id })}
            title={label}
            aria-label={label}
            aria-pressed={settings.lineEnd === id}
          >
            <Icon active={settings.lineEnd === id} />
          </button>
        ))}
      </div>

      <div className="tool-options-quick-colors">
        <button
          type="button"
          className="tool-options-color tool-options-color--add"
          onClick={() => customInputRef.current?.click()}
          title="사용자 색상"
          aria-label="사용자 색상 추가"
        >
          +
        </button>
        <button
          type="button"
          className="tool-options-color active"
          style={swatchStyle(settings.color)}
          title="현재 색상"
          aria-label="현재 색상"
          aria-pressed
        />
        {QUICK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="tool-options-color"
            style={swatchStyle(c)}
            onClick={() => onChange({ color: c })}
            title={c}
            aria-label={`색상 ${c}`}
          />
        ))}
      </div>
      <input
        ref={customInputRef}
        type="color"
        value={settings.color}
        onChange={(e) => onChange({ color: e.target.value })}
        className="tool-options-hidden-color"
        tabIndex={-1}
        aria-hidden="true"
      />

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
            aria-pressed={settings.color === c}
          />
        ))}
        <label className="tool-options-color tool-options-color--picker" title="사용자 색상">
          <input
            type="color"
            value={settings.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="tool-options-hidden-color"
            aria-label="사용자 색상 선택"
          />
          <span className="tool-options-picker-icon" aria-hidden="true">
            🎨
          </span>
        </label>
      </div>
    </div>
  );
}
