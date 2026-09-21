import { afterEach, describe, expect, it } from 'vitest';
import { ellipsize, wrapText } from '../../src/canvas/text';
import { fillSoft, roundedRectPath } from '../../src/canvas/shapes';

const SIZE = { width: 200, height: 120 };
let canvas: HTMLCanvasElement | null = null;

function context(): CanvasRenderingContext2D {
  canvas = document.createElement('canvas');
  canvas.width = SIZE.width;
  canvas.height = SIZE.height;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  return ctx;
}

/** `[r, g, b, a]` at a point, so a drawn frame can be asserted on. */
function pixel(ctx: CanvasRenderingContext2D, x: number, y: number): number[] {
  return Array.from(ctx.getImageData(x, y, 1, 1).data);
}

afterEach(() => {
  canvas?.remove();
  canvas = null;
});

describe('shapes', () => {
  it('fills a rounded rectangle solid in the middle and clear at the corner', () => {
    const ctx = context();
    roundedRectPath(ctx, 10, 10, 100, 60, 12);
    ctx.fillStyle = '#ff0000';
    ctx.fill();

    expect(pixel(ctx, 60, 40)).toEqual([255, 0, 0, 255]);
    // The corner is rounded away, so the very corner pixel stays untouched.
    expect(pixel(ctx, 11, 11)[3]).toBe(0);
  });

  it('paints a soft fill at reduced alpha and restores the previous value', () => {
    const ctx = context();
    ctx.globalAlpha = 0.5;
    fillSoft(ctx, '#0000ff', () => ctx.fillRect(0, 0, 50, 50), 0.2);

    const [, , blue, alpha] = pixel(ctx, 10, 10);
    expect(blue).toBe(255);
    expect(alpha).toBeGreaterThan(40);
    expect(alpha).toBeLessThan(70);
    expect(ctx.globalAlpha).toBe(0.5);
  });
});

describe('text against real font metrics', () => {
  it('never returns a line wider than the budget', () => {
    const ctx = context();
    ctx.font = '13px sans-serif';
    const lines = wrapText(
      ctx,
      'Aspirapolvere senza fili 25000Pa con doppio filtro HEPA lavabile',
      150,
      2
    );

    expect(lines.length).toBeLessThanOrEqual(2);
    lines.forEach((line) => expect(ctx.measureText(line).width).toBeLessThanOrEqual(150));
  });

  it('ellipsises a word longer than the whole line', () => {
    const ctx = context();
    ctx.font = '13px sans-serif';
    const result = ellipsize(ctx, 'Supercalifragilisticexpialidocious', 80);

    expect(result.endsWith('…')).toBe(true);
    expect(ctx.measureText(result).width).toBeLessThanOrEqual(80);
  });

  it('draws the wrapped text where it was measured', () => {
    const ctx = context();
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    wrapText(ctx, 'hello wrapped world', 60, 2).forEach((line, index) => {
      ctx.fillText(line, 0, index * 16);
    });

    // Something was drawn in both line bands.
    const firstLine = ctx.getImageData(0, 0, 60, 15).data.some((value) => value > 0);
    const secondLine = ctx.getImageData(0, 16, 60, 15).data.some((value) => value > 0);
    expect(firstLine).toBe(true);
    expect(secondLine).toBe(true);
  });
});
