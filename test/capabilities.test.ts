import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STRATEGY_ORDER,
  detectCapabilities,
  isStrategySupported,
  readForcedStrategy,
  resolveOrder,
  selectStrategies,
} from '../src/capabilities';
import { CAPABILITIES } from './helpers';

function fakeWindow(options: {
  documentPip?: boolean;
  videoPip?: boolean;
  canvasCapture?: boolean;
  search?: string;
}): Window {
  return {
    document: { pictureInPictureEnabled: options.videoPip === true },
    documentPictureInPicture: options.documentPip ? { requestWindow: () => {} } : undefined,
    HTMLVideoElement: {
      prototype: options.videoPip ? { requestPictureInPicture: () => {} } : {},
    },
    HTMLCanvasElement: {
      prototype: options.canvasCapture ? { captureStream: () => {} } : {},
    },
    location: { search: options.search ?? '' },
  } as unknown as Window;
}

describe('detectCapabilities', () => {
  it('reports everything on a Chromium desktop', () => {
    expect(
      detectCapabilities(fakeWindow({ documentPip: true, videoPip: true, canvasCapture: true }))
    ).toEqual(CAPABILITIES.chromeDesktop);
  });

  it('reports video PiP but no document PiP on Chrome for Android', () => {
    expect(
      detectCapabilities(fakeWindow({ videoPip: true, canvasCapture: true }))
    ).toEqual(CAPABILITIES.chromeAndroid);
  });

  it('reports no picture-in-picture at all on Firefox', () => {
    expect(detectCapabilities(fakeWindow({ canvasCapture: true }))).toEqual(CAPABILITIES.firefox);
  });

  it('survives a window missing the constructors entirely', () => {
    const bare = { document: {}, location: { search: '' } } as unknown as Window;
    expect(detectCapabilities(bare)).toEqual(CAPABILITIES.safari);
  });
});

describe('isStrategySupported', () => {
  it('needs a renderer before the canvas strategy counts as available', () => {
    expect(isStrategySupported('canvas', CAPABILITIES.chromeAndroid, false)).toBe(false);
    expect(isStrategySupported('canvas', CAPABILITIES.chromeAndroid, true)).toBe(true);
  });

  it('treats inline as always available', () => {
    expect(isStrategySupported('inline', CAPABILITIES.safari, false)).toBe(true);
  });
});

describe('selectStrategies', () => {
  const select = (capabilities: Parameters<typeof selectStrategies>[1]) =>
    selectStrategies(DEFAULT_STRATEGY_ORDER, capabilities, true);

  it('prefers the document window on Chromium desktop', () => {
    expect(select(CAPABILITIES.chromeDesktop)).toEqual(['document', 'canvas', 'inline']);
  });

  it('falls to canvas on Chrome for Android', () => {
    expect(select(CAPABILITIES.chromeAndroid)).toEqual(['canvas', 'inline']);
  });

  it('leaves Firefox and Safari with the in-page widget', () => {
    expect(select(CAPABILITIES.firefox)).toEqual(['inline']);
    expect(select(CAPABILITIES.safari)).toEqual(['inline']);
  });

  it('honours a custom order', () => {
    expect(selectStrategies(['inline', 'document'], CAPABILITIES.chromeDesktop, true)).toEqual([
      'inline',
      'document',
    ]);
  });

  it('can end up empty when inline is excluded and nothing else is supported', () => {
    expect(selectStrategies(['document', 'canvas'], CAPABILITIES.safari, true)).toEqual([]);
  });
});

describe('resolveOrder', () => {
  it('moves the forced strategy first without dropping the fallbacks', () => {
    expect(resolveOrder(DEFAULT_STRATEGY_ORDER, 'canvas')).toEqual([
      'canvas',
      'document',
      'inline',
    ]);
  });

  it('is a no-op with nothing forced', () => {
    expect(resolveOrder(DEFAULT_STRATEGY_ORDER, null)).toEqual(DEFAULT_STRATEGY_ORDER);
  });
});

describe('readForcedStrategy', () => {
  it('reads a valid strategy from the query string', () => {
    expect(readForcedStrategy(fakeWindow({ search: '?pip=canvas' }), 'pip')).toBe('canvas');
  });

  it('ignores an unknown value', () => {
    expect(readForcedStrategy(fakeWindow({ search: '?pip=nope' }), 'pip')).toBeNull();
  });

  it('is disabled by passing false', () => {
    expect(readForcedStrategy(fakeWindow({ search: '?pip=canvas' }), false)).toBeNull();
  });
});
