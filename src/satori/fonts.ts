import type { SatoriFont } from './types';

/**
 * Fetches a font file for Satori.
 *
 * Satori needs real font data to turn glyphs into SVG paths, and it reads
 * TTF, OTF and WOFF — **not WOFF2**, which is what a Google Fonts CSS `@import`
 * serves to modern browsers. Point this at a `.ttf` or `.woff` you host, or at a
 * `latin.ttf` from a package like `@fontsource/inter`.
 */
export async function loadFont(
  url: string,
  font: Omit<SatoriFont, 'data'>
): Promise<SatoriFont> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`could not load font ${url}: ${response.status} ${response.statusText}`);
  }
  if (url.endsWith('.woff2')) {
    throw new Error(
      `${url} looks like WOFF2, which Satori cannot read. Use a TTF, OTF or WOFF file.`
    );
  }
  return { ...font, data: await response.arrayBuffer() };
}
