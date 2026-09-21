import satoriStandalone, { init } from 'satori/standalone';
import type { ReactNode } from 'react';
import type { CanvasRenderInfo, CanvasRenderer } from '../types';
import type { SatoriFont } from './types';

export { loadFont } from './fonts';
export type { SatoriFont } from './types';

/** Anything Satori's `init` accepts: a URL, a fetch Response, or the bytes. */
export type YogaWasmSource =
  | string
  | URL
  | Request
  | Response
  | BufferSource
  | WebAssembly.Module
  | Promise<Response | BufferSource | WebAssembly.Module>;

export type SatoriFn = typeof satoriStandalone;

let initialized: Promise<void> | null = null;

/**
 * Satori's layout engine is WebAssembly, and in a browser it has to be handed the
 * module before the first render. Call this once with a URL your app serves:
 *
 * ```ts
 * import yogaWasm from 'satori/yoga.wasm?url';
 * await initSatori(yogaWasm);
 * ```
 *
 * `createSatoriRenderer` will do it for you if you pass the same value as its
 * `yogaWasm` option. Repeat calls reuse the first one.
 */
export function initSatori(source: YogaWasmSource): Promise<void> {
  initialized ??= Promise.resolve(init(source as Parameters<typeof init>[0])).then(
    () => undefined,
    (error: unknown) => {
      // Let a later attempt retry rather than caching the failure forever.
      initialized = null;
      throw error;
    }
  );
  return initialized;
}

export type SatoriRendererOptions<TData> = {
  /** At least one is required — Satori turns glyphs into paths and needs the data. */
  fonts: SatoriFont[];
  /** Builds the element tree for one frame. Flexbox subset, inline styles only. */
  view: (info: CanvasRenderInfo<TData>) => ReactNode;
  /** Initialises the layout engine lazily; see {@link initSatori}. */
  yogaWasm?: YogaWasmSource;
  /** Painted under the frame so the first, not-yet-rasterised paint is not blank. */
  background?: string;
  /** Defaults to Satori's standalone browser build. */
  satori?: SatoriFn;
  embedFont?: boolean;
  debug?: boolean;
  onError?: (error: unknown) => void;
};

/**
 * Rasterises the root `<svg>` at device resolution while leaving its coordinate
 * system in logical units, so the view is authored at `size` and still comes out
 * crisp on a 2× canvas.
 */
function scaleSvgRoot(svg: string, scale: number): string {
  if (scale === 1) return svg;
  const open = /^<svg\b[^>]*>/.exec(svg);
  if (!open) return svg;

  let tag = open[0];
  const width = /\bwidth="([\d.]+)"/.exec(tag);
  const height = /\bheight="([\d.]+)"/.exec(tag);
  if (!width || !height) return svg;

  if (!/\bviewBox=/.test(tag)) {
    tag = tag.replace('<svg', `<svg viewBox="0 0 ${width[1]} ${height[1]}"`);
  }
  tag = tag
    .replace(width[0], `width="${Number(width[1]) * scale}"`)
    .replace(height[0], `height="${Number(height[1]) * scale}"`);

  return tag + svg.slice(open[0].length);
}

async function rasterize(svg: string): Promise<HTMLImageElement> {
  // A blob URL is same-origin, and Satori's default `embedFont` turns text into
  // paths, so the SVG pulls in nothing external. That is what keeps the canvas
  // origin-clean and `captureStream()` working.
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    // Safe once decode() has resolved: the bitmap is already in memory.
    URL.revokeObjectURL(url);
  }
}

/**
 * Builds a `canvas.render` function that draws a Satori-rendered view instead of
 * hand-written canvas calls.
 *
 * Satori is asynchronous and `render` is not, so this draws the most recent frame
 * it managed to rasterise and asks for one extra paint when the next one lands.
 * At the default 1 fps the visible lag is the rasterisation time, not a whole
 * frame interval.
 *
 * Note that Satori does not run React: it reads an element tree with inline
 * `style` props and supports a flexbox subset, so an existing styled component
 * cannot simply be passed through. `view` is a second, simpler view of the same
 * data — the win over drawing by hand is declarative flexbox, not reuse.
 */
export function createSatoriRenderer<TData>(
  options: SatoriRendererOptions<TData>
): CanvasRenderer<TData> {
  const render = options.satori ?? satoriStandalone;
  const ready = () => (options.yogaWasm ? initSatori(options.yogaWasm) : Promise.resolve());

  let ready_image: HTMLImageElement | null = null;
  let rasterizing = false;
  // Set while the extra paint we asked for is in flight, so that paint does not
  // queue yet another rasterisation and spin the loop.
  let ownRepaint = false;

  return (ctx, info) => {
    const deviceWidth = info.width * info.scale;
    const deviceHeight = info.height * info.scale;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (options.background) {
      ctx.fillStyle = options.background;
      ctx.fillRect(0, 0, deviceWidth, deviceHeight);
    }
    if (ready_image) ctx.drawImage(ready_image, 0, 0, deviceWidth, deviceHeight);
    ctx.restore();

    if (ownRepaint) {
      ownRepaint = false;
      return;
    }
    if (rasterizing) return;

    rasterizing = true;
    void ready()
      .then(() =>
        render(options.view(info), {
          width: info.width,
          height: info.height,
          fonts: options.fonts,
          embedFont: options.embedFont !== false,
          debug: options.debug === true,
        })
      )
      .then((svg) => rasterize(scaleSvgRoot(svg, info.scale)))
      .then((image) => {
        ready_image = image;
        rasterizing = false;
        ownRepaint = true;
        info.requestRepaint();
      })
      .catch((error: unknown) => {
        rasterizing = false;
        options.onError?.(error);
      });
  };
}
