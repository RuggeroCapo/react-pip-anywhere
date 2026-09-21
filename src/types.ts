/**
 * Public types. The three strategies are, in the order they are normally tried:
 *
 * - `document` — a real OS window running its own `Document`, via the Document
 *   Picture-in-Picture API. React children are portaled into it, so everything
 *   stays live and interactive. Chromium desktop only.
 * - `canvas` — the frame is painted into a canvas, captured as a `MediaStream`
 *   and played by a hidden `<video>` that enters the classic video PiP. This is
 *   what Chrome on Android can do. The result is a picture: nothing in it is
 *   clickable, so interactive controls have to stay in the page.
 * - `inline` — no PiP at all, just a floating widget inside the page. Firefox,
 *   Safari and iOS land here.
 */

export type PipStrategy = 'document' | 'canvas' | 'inline';

/** The strategy currently in use, or `'closed'` when nothing is open. */
export type PipMode = 'closed' | PipStrategy;

export type Size = { width: number; height: number };

export type Position = { x: number; y: number };

export type PipCapabilities = {
  /** `window.documentPictureInPicture` exists. */
  documentPictureInPicture: boolean;
  /** `document.pictureInPictureEnabled` and the video element API exist. */
  videoPictureInPicture: boolean;
  /** `HTMLCanvasElement.prototype.captureStream` exists. */
  canvasCapture: boolean;
};

export type CanvasRenderInfo<TData> = {
  /** The latest value of `canvas.data`, read through a ref so it is never stale. */
  data: TData;
  /** Logical width; the context is already scaled, so draw in these units. */
  width: number;
  /** Logical height. */
  height: number;
  scale: number;
  /** `Date.now()` at paint time. Keep time-based text honest with this, not with
   * a captured prop — the background repaint outlives React re-renders. */
  now: number;
  /**
   * Asks for another paint outside the normal cadence. Renderers that produce
   * their frame asynchronously (rasterising an SVG, decoding an image) draw what
   * they have, start the work, and call this when the result is ready. Calling it
   * unconditionally from inside `render` would loop forever.
   */
  requestRepaint: () => void;
};

export type CanvasRenderer<TData> = (
  ctx: CanvasRenderingContext2D,
  info: CanvasRenderInfo<TData>
) => void;

export type CanvasStrategyOptions<TData> = {
  /** Logical frame size. Android only accepts aspect ratios between 1:2.39 and
   * 2.39:1; anything outside that is warned about in development. */
  size: Size;
  /** Backing-store multiplier, and therefore the real video resolution. Default 2. */
  scale?: number;
  /**
   * Repaints per second. Default 1. A hidden tab has no `requestAnimationFrame`
   * and Chrome clamps its timers to one tick per second, so values above ~1 only
   * pay off while the page is in the foreground.
   */
  fps?: number;
  /** Mirrored into a ref on every render and handed to `render`. */
  data: TData;
  render: CanvasRenderer<TData>;
  /**
   * Add an inaudible audio track to the captured stream. It exempts the page from
   * Chrome's intensive timer throttling (one tick per minute after five minutes
   * hidden), at the cost of taking Android's audio focus, which pauses whatever
   * the user is listening to. Off by default; turn it on only if a stale frame is
   * worse than interrupted music.
   */
  keepAliveAudio?: boolean;
};

export type DocumentStrategyOptions = {
  /** Initial window size. Default 380×560. */
  size?: Size;
  /** Clone the opener's `<style>` and `<link rel=stylesheet>` nodes. Default true. */
  copyStyles?: boolean;
  /** Extra CSS appended to the PiP document, after the copied stylesheets. */
  css?: string;
  title?: string;
  lang?: string;
  /**
   * Attributes kept in sync from the opener's `<html>` onto the PiP document's,
   * so a theme switch follows the window. Default `['data-theme']`.
   */
  mirrorAttributes?: string[];
};

export type InlineStrategyOptions = {
  /** Used to keep the widget inside the viewport. Default 340×460. */
  size?: Size;
  /** Default true. Drag is disabled below `pinBelowWidth` regardless. */
  draggable?: boolean;
  /** `localStorage` key for the drag position, or false to not persist. */
  positionStorageKey?: string | false;
  /** Below this viewport width the widget is left to CSS. Default 640. */
  pinBelowWidth?: number;
  /**
   * Whether an undragged widget is parked in the bottom-right corner. Default
   * true, which is what a consumer with no CSS of its own wants. Set false when
   * your stylesheet places the widget itself — an inline `right`/`bottom` would
   * otherwise beat your media queries.
   */
  defaultPlacement?: boolean;
  zIndex?: number;
};

/**
 * The platform seam. Everything that touches a browser API the tests cannot drive
 * goes through here, so the state machine can be exercised against fakes.
 */
export type PipPlatform = {
  detect(win: Window): PipCapabilities;
  openDocumentWindow(win: Window, size: Size): Promise<Window>;
  captureCanvas(canvas: HTMLCanvasElement): CanvasCapture;
  enterVideoPip(video: HTMLVideoElement): Promise<void>;
  exitVideoPip(video: HTMLVideoElement): Promise<void>;
  createSilentAudioTrack(win: Window): SilentAudio | null;
};

export type CanvasCapture = {
  stream: MediaStream;
  /** Pushes exactly one frame; the capture rate is 0 so nothing goes out on its own. */
  requestFrame: () => void;
};

export type SilentAudio = {
  track: MediaStreamTrack;
  close: () => void;
};

declare global {
  interface DocumentPictureInPictureOptions {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
    preferInitialWindowPlacement?: boolean;
  }

  interface DocumentPictureInPicture extends EventTarget {
    readonly window: Window | null;
    requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
  }

  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
    webkitAudioContext?: typeof AudioContext;
  }
}
