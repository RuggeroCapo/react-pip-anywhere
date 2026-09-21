import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { clampToViewport } from '../dom';
import type { InlineStrategyOptions, Position, Size } from '../types';

export const DEFAULT_INLINE_SIZE: Size = { width: 340, height: 460 };
const DEFAULT_PIN_BELOW_WIDTH = 640;
const DEFAULT_Z_INDEX = 2147483000;
const EDGE_MARGIN = 16;

function readStoredPosition(win: Window, key: string | false | undefined): Position | null {
  if (!key) return null;
  try {
    const raw = win.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

function writeStoredPosition(win: Window, key: string | false | undefined, position: Position) {
  if (!key) return;
  try {
    win.localStorage.setItem(key, JSON.stringify(position));
  } catch {
    // storage unavailable — the position simply resets on reload
  }
}

export type InlineWidget = {
  ref: RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  /** Spread onto whatever element should act as the drag handle. */
  handleProps: { onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void };
  /** True on viewports narrow enough that the widget is left to CSS. */
  isPinned: boolean;
};

/**
 * The in-page fallback: a floating panel the user can drag, with its position
 * remembered. Below `pinBelowWidth` dragging is off and no position is applied,
 * because on a phone a stored offset only pushes the widget off screen.
 */
export function useInlineWidget(
  options: InlineStrategyOptions | undefined,
  active: boolean
): InlineWidget {
  const size = options?.size ?? DEFAULT_INLINE_SIZE;
  const storageKey = options?.positionStorageKey;
  const pinBelowWidth = options?.pinBelowWidth ?? DEFAULT_PIN_BELOW_WIDTH;
  const draggable = options?.draggable !== false;
  const zIndex = options?.zIndex ?? DEFAULT_Z_INDEX;

  const ref = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    setPosition(readStoredPosition(window, storageKey));
  }, [storageKey]);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${pinBelowWidth}px)`);
    const sync = () => setIsPinned(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [pinBelowWidth]);

  const measure = useCallback((): Size => {
    const rect = ref.current?.getBoundingClientRect();
    return rect && rect.width > 0 ? { width: rect.width, height: rect.height } : size;
  }, [size]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const node = ref.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      dragRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // the window listeners below drive the drag either way
      }
      // Switch from the default corner placement to explicit coordinates at the
      // position the widget is already at, so it does not jump on first drag.
      setPosition(clampToViewport(window, rect.left, rect.top, rect));
    },
    []
  );

  useEffect(() => {
    if (!active || isPinned || !draggable) return;

    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      event.preventDefault();
      setPosition(
        clampToViewport(window, event.clientX - drag.offsetX, event.clientY - drag.offsetY, measure())
      );
    };

    const handleUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      const rect = ref.current?.getBoundingClientRect();
      if (rect) writeStoredPosition(window, storageKey, { x: rect.left, y: rect.top });
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [active, draggable, isPinned, measure, storageKey]);

  // Keep the widget on screen when the viewport shrinks around it.
  useEffect(() => {
    if (!active) return;
    const handleResize = () => {
      setPosition((current) =>
        current ? clampToViewport(window, current.x, current.y, measure()) : current
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active, measure]);

  const placed = position && !isPinned;
  const style: CSSProperties = placed
    ? { position: 'fixed', left: position.x, top: position.y, zIndex }
    : options?.defaultPlacement === false
      ? { position: 'fixed', zIndex }
      : { position: 'fixed', right: EDGE_MARGIN, bottom: EDGE_MARGIN, zIndex };

  return {
    ref,
    style,
    handleProps: draggable && !isPinned ? { onPointerDown } : {},
    isPinned,
  };
}
