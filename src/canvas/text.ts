/**
 * Text measurement helpers for hand-drawn canvas frames. Canvas has no line
 * breaking and no `text-overflow`, so anything that would be one CSS declaration
 * in the DOM has to be measured here.
 *
 * All of these read `ctx.font`, so set it before calling.
 */

/** Trims until the text fits with a trailing ellipsis, which it always gets. */
export function clampWithEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  ellipsis = '…'
): string {
  let cut = text;
  while (cut.length > 0 && ctx.measureText(`${cut.trimEnd()}${ellipsis}`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}${ellipsis}`;
}

/** Returns the text unchanged when it fits, ellipsised when it does not. */
export function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  ellipsis = '…'
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  return clampWithEllipsis(ctx, text, maxWidth, ellipsis);
}

/**
 * Word-wraps to at most `maxLines`, ellipsising the last line when there is more
 * text than room. A single word wider than the line is ellipsised on its own line
 * rather than overflowing.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  ellipsis = '…'
): string[] {
  if (maxLines <= 0) return [];

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  let index = 0;

  while (index < words.length && lines.length < maxLines) {
    const word = words[index] as string;
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      index += 1;
      continue;
    }
    if (current) {
      lines.push(current);
      current = '';
      continue;
    }
    lines.push(ellipsize(ctx, word, maxWidth, ellipsis));
    index += 1;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
    current = '';
  }

  const truncated = index < words.length || current.length > 0;
  if (truncated && lines.length > 0) {
    const last = lines[lines.length - 1] as string;
    lines[lines.length - 1] = clampWithEllipsis(ctx, last, maxWidth, ellipsis);
  }

  return lines;
}
