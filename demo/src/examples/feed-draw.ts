import { fillSoft, readCssVars, wrapText } from '../../../src/canvas';
import type { CanvasRenderInfo } from '../../../src/types';
import { relativeTime } from './feed-data';
import type { FeedItem } from './feed-data';

export const FEED_FRAME_SIZE = { width: 360, height: 540 };

const PAD = 12;
const HEADER_H = 34;
const ROW_H = 58;
const FOOTER_H = 22;
const FRESH_MS = 90_000;

const SANS = "'Archivo', system-ui, -apple-system, sans-serif";
const MONO = "'Spline Sans Mono', ui-monospace, monospace";

/**
 * The colours come from the page's own CSS custom properties, so the frame follows
 * a theme switch without a second palette to keep in step. The fallbacks are the
 * light theme's computed values, for the case where the page stylesheet has not
 * loaded yet.
 */
const PALETTE = {
  surface: ['--surface', '#fffdfa'],
  surface2: ['--surface-2', '#ece8e0'],
  rule: ['--rule', 'rgba(25,20,14,0.14)'],
  text: ['--text', '#19140e'],
  text2: ['--text-2', '#58524b'],
  text3: ['--text-3', '#756f69'],
  accent: ['--accent', '#d83215'],
  tagNew: ['--tag-new', '#2143b7'],
  tagInfo: ['--tag-info', '#58524b'],
  tagAlert: ['--tag-alert', '#be1e00'],
} as const;

type Theme = ReturnType<typeof readCssVars<typeof PALETTE>>;

/** `letterSpacing` landed in Chrome 99 and is a no-op elsewhere, which is fine: the
 * tracking on these labels is a refinement, not load-bearing. */
function tracked(ctx: CanvasRenderingContext2D, spacing: string, paint: () => void) {
  const previous = ctx.letterSpacing;
  ctx.letterSpacing = spacing;
  paint();
  ctx.letterSpacing = previous;
}

export function drawFeedFrame(
  ctx: CanvasRenderingContext2D,
  info: CanvasRenderInfo<FeedItem[]>
): void {
  const { width, height } = info;
  const theme = readCssVars(document.documentElement, PALETTE);
  const items = info.data;

  ctx.textAlign = 'left';
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, width, height);

  drawHeader(ctx, theme, items.length, width);

  const capacity = Math.max(0, Math.floor((height - HEADER_H - FOOTER_H) / ROW_H));
  const visible = items.slice(0, capacity);

  if (visible.length === 0) {
    ctx.font = `400 12px ${SANS}`;
    ctx.fillStyle = theme.text3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Nothing here yet.', width / 2, height / 2);
    ctx.textAlign = 'left';
  } else {
    visible.forEach((item, index) => {
      drawRow(ctx, theme, item, HEADER_H + index * ROW_H, width, info.now);
    });
  }

  drawFooter(ctx, theme, items.length - visible.length, width, height, info.now);
}

/** The ink title bar, matching `.panel-header` in the page stylesheet. */
function drawHeader(ctx: CanvasRenderingContext2D, theme: Theme, count: number, width: number) {
  ctx.fillStyle = theme.text;
  ctx.fillRect(0, 0, width, HEADER_H);

  const centerY = HEADER_H / 2;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(PAD, centerY - 4, 8, 8);

  ctx.textBaseline = 'middle';
  ctx.font = `600 10px ${SANS}`;
  tracked(ctx, '0.1em', () => {
    ctx.fillStyle = theme.surface;
    ctx.fillText('ACTIVITY', PAD + 16, centerY + 0.5);

    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'right';
    ctx.fillText(String(count), width - PAD, centerY + 0.5);
    ctx.textAlign = 'left';
  });
}

function tagColor(theme: Theme, tag: FeedItem['tag']): string {
  if (tag === 'NEW') return theme.tagNew;
  if (tag === 'ALERT') return theme.tagAlert;
  return theme.tagInfo;
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  item: FeedItem,
  top: number,
  width: number,
  now: number
) {
  const isFresh = now - item.at < FRESH_MS;
  if (isFresh) {
    fillSoft(ctx, theme.accent, () => ctx.fillRect(0, top, width, ROW_H), 0.11);
  }

  ctx.fillStyle = theme.rule;
  ctx.fillRect(0, top + ROW_H - 1, width, 1);

  ctx.textBaseline = 'middle';
  ctx.font = `${isFresh ? 600 : 500} 12.5px ${SANS}`;
  ctx.fillStyle = theme.text;
  wrapText(ctx, item.title, width - PAD * 2, 2).forEach((line, index) => {
    ctx.fillText(line, PAD, top + 15 + index * 15);
  });

  const metaY = top + ROW_H - 15;
  let cursor = PAD;

  if (isFresh) {
    ctx.fillStyle = theme.accent;
    ctx.fillRect(cursor, metaY - 3, 6, 6);
    cursor += 12;
  }

  // Square tag box, outlined in its own colour: the same treatment as `.tag`.
  const color = tagColor(theme, item.tag);
  ctx.font = `600 9px ${SANS}`;
  tracked(ctx, '0.08em', () => {
    const tagWidth = ctx.measureText(item.tag).width + 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(cursor + 0.5, metaY - 6.5, tagWidth - 1, 14);
    ctx.fillStyle = color;
    ctx.fillText(item.tag, cursor + 5, metaY + 0.5);
    cursor += tagWidth + 8;
  });

  ctx.font = `500 10px ${SANS}`;
  ctx.fillStyle = theme.text2;
  ctx.fillText(item.meta, cursor, metaY + 0.5);

  ctx.fillStyle = theme.text3;
  ctx.textAlign = 'right';
  ctx.fillText(relativeTime(item.at, now), width - PAD, metaY + 0.5);
  ctx.textAlign = 'left';
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  hidden: number,
  width: number,
  height: number,
  now: number
) {
  const top = height - FOOTER_H;
  ctx.fillStyle = theme.surface2;
  ctx.fillRect(0, top, width, FOOTER_H);
  ctx.fillStyle = theme.rule;
  ctx.fillRect(0, top, width, 1);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.text2;

  ctx.font = `600 9.5px ${SANS}`;
  tracked(ctx, '0.1em', () => {
    ctx.fillText(hidden > 0 ? `+${hidden} MORE` : 'ALL CAUGHT UP', PAD, top + FOOTER_H / 2);
  });

  // The clock is the liveness tell: if the page gets throttled in the background
  // the picture stays up but this stops ticking. It is the one figure here that
  // has to hold a fixed width, so it is the one that stays monospaced.
  ctx.font = `500 9.5px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(
    new Date(now).toLocaleTimeString([], { hour12: false }),
    width - PAD,
    top + FOOTER_H / 2
  );
  ctx.textAlign = 'left';
}
