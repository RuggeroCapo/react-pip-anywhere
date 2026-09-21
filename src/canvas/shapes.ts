/** Shape helpers for hand-drawn canvas frames. */

/**
 * Builds a rounded-rectangle path. Falls back to `arcTo` where `roundRect` is
 * missing, so the same frame renders on older WebViews.
 */
export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/**
 * Paints with a solid colour at reduced alpha, which is how a design system's
 * "soft" background variants can be derived from one token instead of two.
 */
export function fillSoft(
  ctx: CanvasRenderingContext2D,
  color: string,
  paint: () => void,
  alpha = 0.14
): void {
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  paint();
  ctx.globalAlpha = previous;
}
