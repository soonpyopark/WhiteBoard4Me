import { useCallback, useEffect, useRef, useState } from 'react';
import type { DrawingEngine } from '../engine/drawingEngine';
import { MAX_ZOOM, MIN_ZOOM } from '../engine/types';

interface ZoomControlsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  engineRef: React.MutableRefObject<DrawingEngine | null>;
  engineReady: boolean;
}

function ZoomOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 10H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 7.5V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 10H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FitWidthIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 12H16M8 12L10 10M8 12L10 14M16 12L14 10M16 12L14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CenterViewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path
        d="M12 4v3M12 17v3M4 12h3M17 12h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function clampPercent(value: number): number {
  const min = Math.round(MIN_ZOOM * 100);
  const max = Math.round(MAX_ZOOM * 100);
  return Math.max(min, Math.min(max, value));
}

export function ZoomControls({ containerRef, engineRef, engineReady }: ZoomControlsProps) {
  const [percent, setPercent] = useState(100);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('100');
  const inputRef = useRef<HTMLInputElement>(null);

  const getViewportSize = useCallback(() => {
    const el = containerRef.current;
    return { width: el?.clientWidth ?? 0, height: el?.clientHeight ?? 0 };
  }, [containerRef]);

  useEffect(() => {
    if (!engineReady) return;
    const engine = engineRef.current;
    if (!engine) return;

    engine.setOnZoomChange(setPercent);
    setPercent(engine.getZoomPercent());

    return () => {
      engine.setOnZoomChange(null);
    };
  }, [engineReady, engineRef]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const applyPercent = (raw: string) => {
    const parsed = Number.parseInt(raw.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(parsed)) {
      setDraft(String(percent));
      setEditing(false);
      return;
    }

    const next = clampPercent(parsed);
    const { width, height } = getViewportSize();
    engineRef.current?.setZoomPercent(next, width, height);
    setEditing(false);
  };

  const handleZoomOut = () => {
    const { width, height } = getViewportSize();
    engineRef.current?.zoomOut(width, height);
  };

  const handleZoomIn = () => {
    const { width, height } = getViewportSize();
    engineRef.current?.zoomIn(width, height);
  };

  const handleFitWidth = () => {
    const { width, height } = getViewportSize();
    engineRef.current?.fitToWidth(width, height);
  };

  const handleRecenter = () => {
    const { width, height } = getViewportSize();
    engineRef.current?.recenterView(width, height);
  };

  return (
    <div className="zoom-controls" role="group" aria-label="확대/축소">
      <button
        type="button"
        className="zoom-controls__btn"
        onClick={handleZoomOut}
        title="축소"
        aria-label="축소"
      >
        <ZoomOutIcon />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          className="zoom-controls__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => applyPercent(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyPercent(draft);
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(String(percent));
              setEditing(false);
            }
          }}
          aria-label="확대/축소 비율 (%)"
        />
      ) : (
        <button
          type="button"
          className="zoom-controls__percent"
          onClick={() => {
            setDraft(String(percent));
            setEditing(true);
          }}
          title="배율 직접 입력"
          aria-label={`현재 배율 ${percent}%, 클릭하여 변경`}
        >
          {percent}%
        </button>
      )}

      <button
        type="button"
        className="zoom-controls__btn"
        onClick={handleZoomIn}
        title="확대"
        aria-label="확대"
      >
        <ZoomInIcon />
      </button>

      <span className="zoom-controls__divider" aria-hidden="true" />

      <button
        type="button"
        className="zoom-controls__btn"
        onClick={handleFitWidth}
        title="가로 너비에 맞추기"
        aria-label="가로 너비에 맞추기"
      >
        <FitWidthIcon />
      </button>

      <button
        type="button"
        className="zoom-controls__btn"
        onClick={handleRecenter}
        title="내용 중앙으로 이동 (100%)"
        aria-label="내용 중앙으로 이동 (100%)"
      >
        <CenterViewIcon />
      </button>
    </div>
  );
}
