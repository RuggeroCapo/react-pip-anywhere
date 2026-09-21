'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import {
  DEFAULT_STRATEGY_ORDER,
  readForcedStrategy,
  resolveOrder,
  selectStrategies,
} from './capabilities';
import { defaultPlatform } from './platform';
import { DEFAULT_CANVAS_FPS, DEFAULT_CANVAS_SCALE, startCanvasPip } from './strategies/canvas';
import { startDocumentPip } from './strategies/document';
import { useInlineWidget } from './strategies/inline';
import type { InlineWidget } from './strategies/inline';
import type {
  CanvasStrategyOptions,
  DocumentStrategyOptions,
  InlineStrategyOptions,
  PipMode,
  PipPlatform,
  PipStrategy,
} from './types';

export const DEFAULT_FORCE_PARAM = 'pip';

const STAGE_STYLE: CSSProperties = {
  position: 'fixed',
  left: -9999,
  top: 0,
  width: 1,
  height: 1,
  overflow: 'hidden',
  opacity: 0,
  pointerEvents: 'none',
};

export type UsePictureInPictureOptions<TData = unknown> = {
  /** Desired state. Flip it from a click handler: opening needs user activation. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires with the strategy that actually won, which is not knowable up front. */
  onModeChange?: (mode: PipMode) => void;
  /** Fallback order. Default `['document', 'canvas', 'inline']`. */
  strategy?: readonly PipStrategy[];
  documentWindow?: DocumentStrategyOptions;
  /** Omit to disable the canvas strategy entirely. */
  canvas?: CanvasStrategyOptions<TData>;
  inline?: InlineStrategyOptions;
  /**
   * Query parameter that forces one strategy, for testing on a machine that would
   * otherwise always pick another. Default `'pip'`, so `?pip=canvas` works. Pass
   * false to disable.
   */
  forceParam?: string | false;
  /** Test seam; defaults to the real browser APIs. */
  platform?: PipPlatform;
};

export type PipStage = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Keeps the capture surface laid out but off screen. */
  style: CSSProperties;
  /** False when no canvas options were given, so the stage can be skipped. */
  enabled: boolean;
};

export type PictureInPictureRenderState = {
  mode: PipMode;
  /** Spread onto the element that should drag the inline widget. */
  dragHandleProps: InlineWidget['handleProps'];
};

export type PipController = {
  mode: PipMode;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** The Document PiP window, when that strategy won. */
  pipWindow: Window | null;
  stage: PipStage;
  inline: InlineWidget;
};

type Session = {
  dispose: () => void;
  paint?: () => void;
};

export function usePictureInPicture<TData = unknown>(
  options: UsePictureInPictureOptions<TData>
): PipController {
  const {
    open: wantOpen,
    strategy = DEFAULT_STRATEGY_ORDER,
    canvas: canvasOptions,
    documentWindow: documentOptions,
    inline: inlineOptions,
    forceParam = DEFAULT_FORCE_PARAM,
    platform = defaultPlatform,
  } = options;

  const [mode, setMode] = useState<PipMode>('closed');
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const openingRef = useRef(false);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  // Latest props, mirrored so the background repaint timer and the async open
  // sequence never read a stale closure.
  const latest = useRef(options);
  latest.current = options;

  const teardown = useCallback(() => {
    sessionRef.current?.dispose();
    sessionRef.current = null;
    setPipWindow(null);
    setMode('closed');
  }, []);

  const requestClose = useCallback(() => {
    latest.current.onOpenChange(false);
  }, []);

  useEffect(() => {
    if (!wantOpen) {
      if (sessionRef.current || mode !== 'closed') teardown();
      return;
    }
    if (sessionRef.current || openingRef.current || mode !== 'closed') return;

    let cancelled = false;
    openingRef.current = true;

    const attempt = async () => {
      const win = window;
      const capabilities = platform.detect(win);
      const forced = readForcedStrategy(win, forceParam);
      const order = selectStrategies(
        resolveOrder(strategy, forced),
        capabilities,
        Boolean(latest.current.canvas)
      );

      for (const candidate of order) {
        if (cancelled) return;
        try {
          if (candidate === 'inline') {
            setMode('inline');
            return;
          }

          if (candidate === 'document') {
            const session = await startDocumentPip(
              win,
              platform,
              latest.current.documentWindow ?? {},
              requestClose
            );
            if (cancelled) {
              session.dispose();
              return;
            }
            sessionRef.current = { dispose: session.dispose };
            setPipWindow(session.window);
            setMode('document');
            return;
          }

          const config = latest.current.canvas;
          const canvasEl = canvasElRef.current;
          const videoEl = videoElRef.current;
          if (!config || !canvasEl || !videoEl) continue;

          const session = await startCanvasPip<TData>({
            platform,
            win,
            canvas: canvasEl,
            video: videoEl,
            size: config.size,
            scale: config.scale ?? DEFAULT_CANVAS_SCALE,
            fps: config.fps ?? DEFAULT_CANVAS_FPS,
            keepAliveAudio: config.keepAliveAudio === true,
            render: config.render,
            getData: () => latest.current.canvas?.data as TData,
            onLeave: requestClose,
          });
          if (cancelled) {
            session.dispose();
            return;
          }
          sessionRef.current = session;
          setMode('canvas');
          return;
        } catch {
          // This strategy refused; fall through to the next one.
        }
      }

      // Nothing was available, so the consumer's `open` is not achievable.
      if (!cancelled) requestClose();
    };

    void attempt().finally(() => {
      openingRef.current = false;
    });

    return () => {
      cancelled = true;
    };
    // `mode` is read to avoid reopening over a live session; the rest is in refs.
  }, [forceParam, mode, platform, requestClose, strategy, teardown, wantOpen]);

  useEffect(() => {
    latest.current.onModeChange?.(mode);
  }, [mode]);

  // Foreground repaint: follows the data the consumer passed in.
  useEffect(() => {
    if (mode !== 'canvas') return;
    sessionRef.current?.paint?.();
  }, [mode, canvasOptions?.data]);

  // A PiP window and a PiP video both outlive the React tree.
  useEffect(() => {
    return () => {
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, []);

  const inline = useInlineWidget(inlineOptions, mode === 'inline');

  const open = useCallback(() => latest.current.onOpenChange(true), []);
  const close = useCallback(() => latest.current.onOpenChange(false), []);
  const toggle = useCallback(
    () => latest.current.onOpenChange(!latest.current.open),
    []
  );

  return {
    mode,
    isOpen: mode !== 'closed',
    open,
    close,
    toggle,
    pipWindow,
    stage: {
      canvasRef: canvasElRef,
      videoRef: videoElRef,
      style: STAGE_STYLE,
      enabled: Boolean(canvasOptions),
    },
    inline,
  };
}
