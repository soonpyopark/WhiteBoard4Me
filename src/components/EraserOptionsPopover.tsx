import { useEffect, useRef, useState } from 'react';
import { ERASER_MODE_OPTIONS, type EraserSettings } from '../eraserSettings';

interface EraserOptionsPopoverProps {
  settings: EraserSettings;
  onChange: (patch: Partial<EraserSettings>) => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function EraserOptionsPopover({
  settings,
  onChange,
  anchorRef,
  onClose,
}: EraserOptionsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
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

  return (
    <div
      ref={popoverRef}
      className="tool-options-popover eraser-options-popover"
      style={{ left: style.left, top: style.top }}
      role="dialog"
      aria-label="지우개 설정"
    >
      <div className="eraser-mode-list" role="group" aria-label="지우개 모드">
        {ERASER_MODE_OPTIONS.map(({ id, label, description }) => (
          <button
            key={id}
            type="button"
            className={`eraser-mode-btn ${settings.mode === id ? 'active' : ''}`}
            onClick={() => onChange({ mode: id })}
            title={description}
            aria-pressed={settings.mode === id}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
