import { vi } from 'vitest';
import type { PipCapabilities, PipPlatform, Size } from '../src/types';

/**
 * A context stub whose `measureText` is a fixed width per character. Font metrics
 * are not what the wrapping logic is being tested for, and a deterministic number
 * makes the expectations readable.
 */
export function fakeMeasuringContext(charWidth = 10): CanvasRenderingContext2D {
  return {
    measureText: (text: string) => ({ width: text.length * charWidth }),
  } as unknown as CanvasRenderingContext2D;
}

export const CAPABILITIES = {
  chromeDesktop: {
    documentPictureInPicture: true,
    videoPictureInPicture: true,
    canvasCapture: true,
  },
  chromeAndroid: {
    documentPictureInPicture: false,
    videoPictureInPicture: true,
    canvasCapture: true,
  },
  firefox: {
    documentPictureInPicture: false,
    videoPictureInPicture: false,
    canvasCapture: true,
  },
  safari: {
    documentPictureInPicture: false,
    videoPictureInPicture: false,
    canvasCapture: false,
  },
} satisfies Record<string, PipCapabilities>;

export type FakePlatform = PipPlatform & {
  pipWindow: { closed: boolean; listeners: Record<string, (() => void)[]> };
  tracksStopped: number;
  enteredVideoPip: boolean;
};

/**
 * A platform whose every call is observable and whose failures are arrangeable,
 * so the fallback chain can be driven without a browser.
 */
export function createFakePlatform(
  capabilities: PipCapabilities,
  failures: Partial<Record<'document' | 'video', boolean>> = {}
): FakePlatform {
  const listeners: Record<string, (() => void)[]> = {};
  const pipWindow = {
    closed: false,
    listeners,
    addEventListener: (type: string, fn: () => void) => {
      (listeners[type] ??= []).push(fn);
    },
    removeEventListener: (type: string, fn: () => void) => {
      listeners[type] = (listeners[type] ?? []).filter((entry) => entry !== fn);
    },
    close: () => {
      pipWindow.closed = true;
    },
    document: createFakeDocument(),
  };

  const platform: FakePlatform = {
    pipWindow: pipWindow as unknown as FakePlatform['pipWindow'],
    tracksStopped: 0,
    enteredVideoPip: false,

    detect: () => capabilities,

    openDocumentWindow: vi.fn(async (_win: Window, _size: Size) => {
      if (failures.document) throw new Error('refused');
      return pipWindow as unknown as Window;
    }),

    captureCanvas: vi.fn((_canvas: HTMLCanvasElement) => ({
      stream: {
        addTrack: () => {},
        getTracks: () => [
          {
            stop: () => {
              platform.tracksStopped += 1;
            },
          },
        ],
      } as unknown as MediaStream,
      requestFrame: vi.fn(),
    })),

    enterVideoPip: vi.fn(async (_video: HTMLVideoElement) => {
      if (failures.video) throw new Error('refused');
      platform.enteredVideoPip = true;
    }),

    exitVideoPip: vi.fn(async () => {
      platform.enteredVideoPip = false;
    }),

    createSilentAudioTrack: vi.fn(() => null),
  };

  return platform;
}

function createFakeDocument() {
  const head = { appendChild: () => {} };
  const body = document.createElement('div');
  return {
    head,
    body,
    title: '',
    documentElement: document.createElement('html'),
    createElement: (tag: string) => document.createElement(tag),
    querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement>,
  };
}

/**
 * happy-dom has no 2d context, no media playback and no canvas capture, so the
 * pieces the canvas strategy touches are stubbed here. Returns a disposer.
 */
export function stubCanvasEnvironment(): () => void {
  const canvasProto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  const videoProto = HTMLVideoElement.prototype as unknown as Record<string, unknown>;
  const originalGetContext = canvasProto.getContext;
  const originalPlay = videoProto.play;
  const readyStateDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'readyState'
  );
  const srcObjectDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'srcObject'
  );

  canvasProto.getContext = () =>
    ({
      save: () => {},
      restore: () => {},
      setTransform: () => {},
      clearRect: () => {},
      measureText: (text: string) => ({ width: text.length * 10 }),
    }) as unknown as CanvasRenderingContext2D;

  videoProto.play = async () => {};
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => 2,
  });
  // happy-dom type-checks srcObject against its own MediaStream, which the fake
  // platform does not build.
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    writable: true,
    value: null,
  });

  return () => {
    canvasProto.getContext = originalGetContext;
    videoProto.play = originalPlay;
    if (readyStateDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'readyState', readyStateDescriptor);
    }
    if (srcObjectDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', srcObjectDescriptor);
    }
  };
}
