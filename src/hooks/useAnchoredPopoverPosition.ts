import { type DependencyList, type RefObject, useEffect, useState } from 'react';

export interface AnchoredPopoverStyle {
  left: number;
  top: number;
  transform: string;
}

interface UseAnchoredPopoverPositionOptions {
  gap?: number;
  padding?: number;
  fallbackWidth?: number;
  fallbackHeight?: number;
}

const DEFAULT_OPTIONS: Required<UseAnchoredPopoverPositionOptions> = {
  gap: 8,
  padding: 8,
  fallbackWidth: 220,
  fallbackHeight: 280,
};

export function useAnchoredPopoverPosition(
  anchorRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  deps: DependencyList = [],
  options: UseAnchoredPopoverPositionOptions = {},
): AnchoredPopoverStyle {
  const { gap, padding, fallbackWidth, fallbackHeight } = { ...DEFAULT_OPTIONS, ...options };
  const [style, setStyle] = useState<AnchoredPopoverStyle>({
    left: 0,
    top: 0,
    transform: 'translateX(-50%)',
  });

  useEffect(() => {
    if (!enabled) return;

    const anchor = anchorRef.current;
    if (!anchor) return;

    const updatePosition = () => {
      const currentAnchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!currentAnchor) return;

      const rect = currentAnchor.getBoundingClientRect();
      const popoverWidth = popover?.offsetWidth ?? fallbackWidth;
      const popoverHeight = popover?.offsetHeight ?? fallbackHeight;

      let centerX = rect.left + rect.width / 2;
      let top = rect.bottom + gap;

      const halfW = popoverWidth / 2;
      centerX = Math.max(padding + halfW, Math.min(window.innerWidth - padding - halfW, centerX));

      if (top + popoverHeight > window.innerHeight - padding) {
        const aboveTop = rect.top - popoverHeight - gap;
        top =
          aboveTop >= padding
            ? aboveTop
            : Math.max(padding, window.innerHeight - popoverHeight - padding);
      }

      setStyle({
        left: centerX,
        top,
        transform: 'translateX(-50%)',
      });
    };

    updatePosition();
    const frame = window.requestAnimationFrame(() => {
      updatePosition();
      if (popoverRef.current) {
        observer?.observe(popoverRef.current);
      }
    });

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePosition) : null;
    observer?.observe(anchor);
    if (popoverRef.current) {
      observer?.observe(popoverRef.current);
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies content-size deps
  }, [enabled, anchorRef, popoverRef, fallbackHeight, fallbackWidth, gap, padding, ...deps]);

  return style;
}
