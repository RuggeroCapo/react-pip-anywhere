import type { PipCapabilities, PipStrategy } from './types';

const STRATEGIES: readonly PipStrategy[] = ['document', 'canvas', 'inline'];

export const DEFAULT_STRATEGY_ORDER: readonly PipStrategy[] = STRATEGIES;

function isStrategy(value: unknown): value is PipStrategy {
  return STRATEGIES.includes(value as PipStrategy);
}

/**
 * Feature detection only — no user-agent sniffing. It happens to sort browsers
 * correctly anyway: Chromium desktop has all three, Chrome on Android has
 * everything but `documentPictureInPicture`, and Firefox, Safari and iOS have
 * neither PiP API and fall through to the in-page widget.
 */
export function detectCapabilities(win: Window): PipCapabilities {
  const doc = win.document;
  // `Window` in lib.dom carries no constructor properties, and a test fake may be
  // missing them entirely, so they are read defensively rather than typed.
  const globals = win as unknown as {
    HTMLVideoElement?: { prototype?: Partial<HTMLVideoElement> };
    HTMLCanvasElement?: { prototype?: Partial<HTMLCanvasElement> };
  };

  return {
    documentPictureInPicture: typeof win.documentPictureInPicture?.requestWindow === 'function',
    videoPictureInPicture:
      doc.pictureInPictureEnabled === true &&
      typeof globals.HTMLVideoElement?.prototype?.requestPictureInPicture === 'function',
    canvasCapture: typeof globals.HTMLCanvasElement?.prototype?.captureStream === 'function',
  };
}

export function isStrategySupported(
  strategy: PipStrategy,
  capabilities: PipCapabilities,
  hasCanvasRenderer: boolean
): boolean {
  switch (strategy) {
    case 'document':
      return capabilities.documentPictureInPicture;
    case 'canvas':
      return (
        hasCanvasRenderer && capabilities.videoPictureInPicture && capabilities.canvasCapture
      );
    case 'inline':
      return true;
  }
}

/**
 * Moves `forced` to the front without dropping the rest, so a forced strategy that
 * then fails still degrades instead of leaving the consumer with nothing.
 */
export function resolveOrder(
  order: readonly PipStrategy[],
  forced: PipStrategy | null
): readonly PipStrategy[] {
  if (!forced) return order;
  return [forced, ...order.filter((strategy) => strategy !== forced)];
}

/** The strategies to try, in order, given what this browser can actually do. */
export function selectStrategies(
  order: readonly PipStrategy[],
  capabilities: PipCapabilities,
  hasCanvasRenderer: boolean
): readonly PipStrategy[] {
  return order.filter((strategy) =>
    isStrategySupported(strategy, capabilities, hasCanvasRenderer)
  );
}

/**
 * Reads the development override (`?pip=canvas` by default), which is the only way
 * to exercise the canvas path on a desktop Chromium that would otherwise always
 * pick the document window.
 */
export function readForcedStrategy(win: Window, param: string | false): PipStrategy | null {
  if (!param) return null;
  try {
    const value = new URLSearchParams(win.location.search).get(param);
    return isStrategy(value) ? value : null;
  } catch {
    return null;
  }
}
