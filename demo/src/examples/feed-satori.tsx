import type { CanvasRenderInfo } from '../../../src/types';
import { relativeTime } from './feed-data';
import type { FeedItem } from './feed-data';

/**
 * The same frame as `feed-draw.ts`, written as flexbox instead of coordinates.
 *
 * Satori does not run React and ignores `className`: it reads this tree's inline
 * styles directly, so this is a second view of the data, not the app's component
 * reused. What it buys over drawing by hand is that the layout is declarative.
 *
 * It also cannot read the page's custom properties the way the hand-drawn frame
 * does. Satori parses colours with `parse-css-color`, which predates CSS Color 4
 * and rejects `oklch()`, so the palette is repeated here as hex, in both themes.
 * That second copy is the real cost of this path, and worth seeing in the demo.
 */
const THEMES = {
  light: {
    surface: '#fffdfa',
    surface2: '#ece8e0',
    rule: 'rgba(25,20,14,0.14)',
    text: '#19140e',
    text2: '#58524b',
    text3: '#756f69',
    accent: '#d83215',
    freshFill: 'rgba(216,50,21,0.11)',
    tag: { NEW: '#2143b7', INFO: '#58524b', ALERT: '#be1e00' },
  },
  dark: {
    surface: '#1e1a16',
    surface2: '#2a2520',
    rule: 'rgba(243,241,237,0.15)',
    text: '#f3f1ed',
    text2: '#afaba5',
    text3: '#8e8a84',
    accent: '#ee5c3c',
    freshFill: 'rgba(238,92,60,0.13)',
    tag: { NEW: '#5e8ef1', INFO: '#afaba5', ALERT: '#fa7957' },
  },
} as const;

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? THEMES.dark : THEMES.light;
}

/** Painted under the frame until the first rasterisation lands, so the capture
 * never starts on an empty black rectangle. */
export function frameBackground(): string {
  return currentTheme().surface;
}

const MONO = 'Spline Sans Mono';

export function FeedFrame({ data, now, height }: CanvasRenderInfo<FeedItem[]>) {
  const t = currentTheme();
  const visible = data.slice(0, 8);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: t.surface,
        fontFamily: 'Archivo',
        color: t.text,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          height: 34,
          background: t.text,
          color: t.surface,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', width: 8, height: 8, background: t.accent }} />
          <div style={{ display: 'flex' }}>ACTIVITY</div>
        </div>
        <div style={{ display: 'flex', color: t.accent }}>{String(data.length)}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {visible.map((item) => {
          const fresh = now - item.at < 90_000;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '10px 12px',
                borderBottom: `1px solid ${t.rule}`,
                background: fresh ? t.freshFill : 'transparent',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 12.5,
                  lineHeight: 1.25,
                  fontWeight: fresh ? 600 : 400,
                }}
              >
                {item.title.length > 58 ? `${item.title.slice(0, 58)}…` : item.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 10,
                  fontWeight: 400,
                  color: t.text2,
                }}
              >
                {fresh ? (
                  <div style={{ display: 'flex', width: 6, height: 6, background: t.accent }} />
                ) : null}
                <div
                  style={{
                    display: 'flex',
                    padding: '2px 5px',
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: 0.7,
                    color: t.tag[item.tag],
                    border: `1px solid ${t.tag[item.tag]}`,
                  }}
                >
                  {item.tag}
                </div>
                <div style={{ display: 'flex' }}>{item.meta}</div>
                <div style={{ display: 'flex', marginLeft: 'auto', color: t.text3 }}>
                  {relativeTime(item.at, now)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 12px',
          height: 22,
          background: t.surface2,
          borderTop: `1px solid ${t.rule}`,
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: 0.9,
          color: t.text2,
        }}
      >
        <div style={{ display: 'flex' }}>SATORI · {String(height)}PX</div>
        {/* The clock is the one figure that has to hold a fixed width as it ticks. */}
        <div style={{ display: 'flex', fontFamily: MONO, fontWeight: 500, letterSpacing: 0 }}>
          {new Date(now).toLocaleTimeString([], { hour12: false })}
        </div>
      </div>
    </div>
  );
}
