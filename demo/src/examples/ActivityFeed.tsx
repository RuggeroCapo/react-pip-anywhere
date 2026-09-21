import { useEffect, useRef, useState } from 'react';
import archivoRegularUrl from '@fontsource/archivo/files/archivo-latin-400-normal.woff?url';
import archivoSemiBoldUrl from '@fontsource/archivo/files/archivo-latin-600-normal.woff?url';
import monoUrl from '@fontsource/spline-sans-mono/files/spline-sans-mono-latin-500-normal.woff?url';
import yogaWasmUrl from 'satori/yoga.wasm?url';
import { PictureInPicture } from '../../../src/index';
import type { CanvasRenderer, PipMode } from '../../../src/types';
import { FEED_FRAME_SIZE, drawFeedFrame } from './feed-draw';
import { FeedFrame, frameBackground } from './feed-satori';
import { makeItem, relativeTime, seedFeed } from './feed-data';
import type { FeedItem } from './feed-data';
import { ExampleFrame } from './shared';

const CODE = `<PictureInPicture
  open={open}
  onOpenChange={setOpen}
  onModeChange={setMode}
  canvas={{
    size: { width: 360, height: 540 },
    data: items,
    render: drawFeedFrame,   // or a Satori renderer
    fps: 1,
  }}
  inline={{ positionStorageKey: 'demo.activity-feed.position' }}
  controls={<CloseButton />}  // canvas mode only
>
  {({ dragHandleProps }) => <FeedPanel items={items} {...dragHandleProps} />}
</PictureInPicture>`;

/**
 * Notification-style feed: a list that keeps changing in the background, which is
 * the case document PiP, canvas capture and the in-page fallback all have to keep
 * live. Doubles as a renderer comparison — the same frame drawn with `render(ctx)`
 * or with Satori's flexbox view.
 */
export default function ActivityFeed() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PipMode>('closed');
  const [items, setItems] = useState<FeedItem[]>(() => seedFeed(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [renderer, setRenderer] = useState<'canvas' | 'satori'>('canvas');
  const [satoriRenderer, setSatoriRenderer] = useState<CanvasRenderer<FeedItem[]> | null>(null);

  useEffect(() => {
    const additions = setInterval(() => {
      setItems((current) => [makeItem(Date.now()), ...current].slice(0, 40));
    }, 4000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(additions);
      clearInterval(clock);
    };
  }, []);

  // Satori and its two WebAssembly modules are about a megabyte, so the subpath is
  // only pulled in if the user actually asks for that renderer.
  useEffect(() => {
    if (renderer !== 'satori' || satoriRenderer) return;
    let cancelled = false;

    void (async () => {
      const { createSatoriRenderer, loadFont } = await import('../../../src/satori');
      // Satori needs real font files, one per weight it is allowed to use.
      const fonts = await Promise.all([
        loadFont(archivoRegularUrl, { name: 'Archivo', weight: 400 }),
        loadFont(archivoSemiBoldUrl, { name: 'Archivo', weight: 600 }),
        loadFont(monoUrl, { name: 'Spline Sans Mono', weight: 500 }),
      ]);
      if (cancelled) return;
      const draw = createSatoriRenderer<FeedItem[]>({
        fonts,
        yogaWasm: yogaWasmUrl,
        background: frameBackground(),
        view: (info) => <FeedFrame {...info} />,
        onError: (error) => console.error('[satori]', error),
      });
      setSatoriRenderer(() => draw);
    })();

    return () => {
      cancelled = true;
    };
  }, [renderer, satoriRenderer]);

  const render: CanvasRenderer<FeedItem[]> =
    renderer === 'satori' && satoriRenderer ? satoriRenderer : drawFeedFrame;

  return (
    <ExampleFrame
      title="Activity feed"
      tagline="A list that keeps changing while you are not looking at it, painted two ways for the canvas fallback. The clock in the frame is the liveness tell: if the browser throttles the hidden tab, the picture stays up but the clock stops."
      badges={['document', 'canvas', 'satori']}
      mode={mode}
      extraControls={
        <label className="renderer">
          Renderer
          <select value={renderer} onChange={(event) => setRenderer(event.target.value as 'canvas' | 'satori')}>
            <option value="canvas">render(ctx)</option>
            <option value="satori">Satori</option>
          </select>
        </label>
      }
      open={open}
      onToggle={() => setOpen((value) => !value)}
      code={CODE}
      aside={
        <>
          <span className="aside-label">Canvas frame, drawn in the page</span>
          <FeedPreviewCanvas items={items} render={render} />
          <p className="aside-hint">
            {renderer === 'satori' ? (
              <>
                The Satori view, rasterised and painted here. Satori is asynchronous, so what you see
                is the most recent frame it managed to finish.
              </>
            ) : (
              <>
                The same <code>render(ctx)</code> the canvas strategy captures, painted here so the
                frame can be worked on without opening picture-in-picture at all.
              </>
            )}
          </p>
        </>
      }
    >
      <PictureInPicture<FeedItem[]>
        open={open}
        onOpenChange={setOpen}
        onModeChange={setMode}
        className="panel-shell"
        controlsClassName="pip-controls"
        documentWindow={{
          size: { width: 380, height: 560 },
          title: 'Activity feed',
          css: 'body { margin: 0 } .panel { height: 100vh; border: 0; border-radius: 0 }',
        }}
        canvas={{ size: FEED_FRAME_SIZE, data: items, render, fps: 1 }}
        inline={{ positionStorageKey: 'demo.activity-feed.position' }}
        controls={
          <>
            <span className="pip-controls-label">Feed is in picture-in-picture</span>
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </>
        }
      >
        {({ dragHandleProps }) => (
          <div className="panel">
            <div className="panel-header" {...dragHandleProps}>
              <span className="dot" />
              <strong>Activity</strong>
              <span className="count">{items.length}</span>
            </div>
            <ul className="panel-list">
              {items.slice(0, 20).map((item) => (
                <li key={item.id} className={now - item.at < 90_000 ? 'fresh' : undefined}>
                  <span className="row-title">{item.title}</span>
                  <span className="row-meta">
                    {now - item.at < 90_000 && <span className="fresh-mark" aria-hidden="true" />}
                    <span className={`tag tag-${item.tag.toLowerCase()}`}>{item.tag}</span>
                    <span className="price">{item.meta}</span>
                    <span className="ago">{relativeTime(item.at, now)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PictureInPicture>
    </ExampleFrame>
  );
}

/** Draws the same frame in the page so the canvas renderer can be worked on
 * without opening picture-in-picture at all. */
function FeedPreviewCanvas({
  items,
  render,
}: {
  items: FeedItem[];
  render: CanvasRenderer<FeedItem[]>;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const paint = () => {
      ctx.save();
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, FEED_FRAME_SIZE.width, FEED_FRAME_SIZE.height);
      render(ctx, {
        data: items,
        width: FEED_FRAME_SIZE.width,
        height: FEED_FRAME_SIZE.height,
        scale: 2,
        now: Date.now(),
        requestRepaint: paint,
      });
      ctx.restore();
    };

    paint();
    const timer = setInterval(paint, 1000);
    return () => clearInterval(timer);
  }, [items, render]);

  return (
    <canvas
      ref={ref}
      width={FEED_FRAME_SIZE.width * 2}
      height={FEED_FRAME_SIZE.height * 2}
      style={{ width: FEED_FRAME_SIZE.width }}
      role="img"
      aria-label="Live preview of the canvas frame the mobile strategy captures"
    />
  );
}
