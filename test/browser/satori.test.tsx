import { afterEach, beforeAll, expect, it } from 'vitest';
import fontUrl from '@fontsource/inter/files/inter-latin-400-normal.woff?url';
import yogaWasmUrl from 'satori/yoga.wasm?url';
import { createSatoriRenderer, initSatori, loadFont } from '../../src/satori';
import type { SatoriFont } from '../../src/satori';
import type { CanvasRenderInfo } from '../../src/types';

const SIZE = { width: 180, height: 90 };
const SCALE = 2;

let font: SatoriFont;
let canvas: HTMLCanvasElement | null = null;

beforeAll(async () => {
  // Satori's layout engine is WebAssembly and has to be initialised in a browser
  // before the first render.
  await initSatori(yogaWasmUrl);
  font = await loadFont(fontUrl, { name: 'Inter', weight: 400, style: 'normal' });
}, 30_000);

afterEach(() => {
  canvas?.remove();
  canvas = null;
});

function context(): CanvasRenderingContext2D {
  canvas = document.createElement('canvas');
  canvas.width = SIZE.width * SCALE;
  canvas.height = SIZE.height * SCALE;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  return ctx;
}

/** Satori reads inline styles and a flexbox subset; `className` does nothing. */
const view = () => (
  <div
    style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      background: '#111318',
      color: '#a3e635',
      fontSize: 18,
      fontFamily: 'Inter',
      padding: 12,
    }}
  >
    Live now
  </div>
);

/**
 * Drives the renderer through its two-phase paint: the first call draws what it
 * has (nothing yet) and starts rasterising, then `requestRepaint` brings the
 * finished frame in.
 */
async function renderOnce(ctx: CanvasRenderingContext2D, background?: string): Promise<void> {
  const renderer = createSatoriRenderer<null>({ fonts: [font], view, background });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('satori frame never arrived')), 10_000);
    const info: CanvasRenderInfo<null> = {
      data: null,
      width: SIZE.width,
      height: SIZE.height,
      scale: SCALE,
      now: Date.now(),
      requestRepaint: () => {
        clearTimeout(timeout);
        renderer(ctx, info);
        resolve();
      },
    };
    renderer(ctx, info);
  });
}

it('draws a Satori view onto the canvas', async () => {
  const ctx = context();
  await renderOnce(ctx);

  // The view fills the frame, so the background colour must have landed.
  const [r, g, b, a] = Array.from(ctx.getImageData(4, 4, 1, 1).data);
  expect(a).toBe(255);
  expect([r, g, b]).toEqual([0x11, 0x13, 0x18]);
}, 20_000);

it('rasterises at device resolution, not logical resolution', async () => {
  const ctx = context();
  await renderOnce(ctx);
  // The whole backing store is covered, including past the logical size.
  const far = Array.from(ctx.getImageData(SIZE.width * SCALE - 2, SIZE.height * SCALE - 2, 1, 1).data);
  expect(far[3]).toBe(255);
}, 20_000);

it('leaves the canvas origin-clean, so captureStream still works', async () => {
  const ctx = context();
  await renderOnce(ctx);

  // Both of these throw SecurityError on a tainted canvas; that would break the
  // whole mobile strategy, so it is the assertion that matters most here.
  expect(() => ctx.getImageData(0, 0, 1, 1)).not.toThrow();
  const stream = (canvas as HTMLCanvasElement).captureStream(0);
  expect(stream.getVideoTracks()).toHaveLength(1);
  stream.getTracks().forEach((track) => track.stop());
}, 20_000);

it('paints the background before the first frame has rasterised', () => {
  const ctx = context();
  const renderer = createSatoriRenderer<null>({ fonts: [font], view, background: '#ff0000' });
  renderer(ctx, {
    data: null,
    width: SIZE.width,
    height: SIZE.height,
    scale: SCALE,
    now: Date.now(),
    requestRepaint: () => {},
  });

  expect(Array.from(ctx.getImageData(2, 2, 1, 1).data)).toEqual([255, 0, 0, 255]);
});

it('rejects a WOFF2 font with a message that says why', async () => {
  await expect(loadFont('/x/inter.woff2', { name: 'Inter' })).rejects.toThrow(/WOFF2|could not load/);
});
