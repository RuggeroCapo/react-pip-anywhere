# react-pip-anywhere

Drop a `<PictureInPicture>` around any React component and get a real
picture-in-picture window on every platform that can do one — with an honest,
automatic fallback on the platforms that can't. One component, no per-browser
branching in your app code.

```bash
npm install react-pip-anywhere
```

## Why

Picture-in-picture is three unrelated APIs wearing one name, and none of them
agree on what "your component" even means:

- Chromium on the desktop has the Document Picture-in-Picture API: a real OS
  window with its own document, which you can portal a React tree into.
  Everything stays live and clickable, and it is about twenty lines of code.
- Chrome on Android does not have it. It has only the classic video-element
  API, so the only way to get a floating panel there is to paint your UI into a
  canvas, capture that canvas as a `MediaStream`, and play the stream in a
  hidden `<video>` that enters picture-in-picture. The result is a picture: it
  updates, but nothing in it can be pressed.
- Firefox, Safari and iOS have neither, and need an in-page fallback.

Wiring all three by hand means three code paths, three sets of lifecycle bugs,
and a canvas renderer you write from scratch. This package is that state
machine, capture pipeline and lifecycle handling, already done — you supply
your component (and, for the video fallback, a `render` function), pick a
`strategy` order or let feature detection choose one, and the package handles
opening, closing, teardown and the mobile canvas plumbing for you.

## Quick start

```tsx
import { useState } from 'react';
import { PictureInPicture } from 'react-pip-anywhere';

function Dashboard({ items }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Opening needs a user gesture, so flip the flag from a click. */}
      <button onClick={() => setOpen((value) => !value)}>Picture-in-picture</button>

      <PictureInPicture
        open={open}
        onOpenChange={setOpen}
        canvas={{
          size: { width: 360, height: 540 },
          data: items,
          render: (ctx, { data, width, height }) => drawFrame(ctx, data, width, height),
        }}
        controls={<Filters />}
      >
        <FeedPanel items={items} />
      </PictureInPicture>
    </>
  );
}
```

`children` is what goes in the window — portaled in `document` mode, rendered as a
floating widget in `inline` mode. `canvas.render` is what gets painted in `canvas`
mode. `controls` stays in the page, and only appears in `canvas` mode, because the
frame there is an image.

Omit `canvas` entirely and the strategy is skipped: you get document PiP where it
exists and the in-page widget everywhere else.

## What each browser gets

| | Document PiP | Canvas → video PiP | In-page widget |
|---|---|---|---|
| Chrome / Edge desktop | ✅ | | |
| Chrome Android | | ✅ | |
| Firefox | | | ✅ |
| Safari desktop | | | ✅ |
| iOS | | | ✅ |

Selection is by feature detection, never user agent. iOS has no
`requestPictureInPicture`, WebKit refuses PiP for MediaStream-backed videos, and
it suspends the page in the background anyway, so there is no canvas path there
and the package does not pretend otherwise.

Override the order with `strategy={['canvas', 'inline']}`, and force one at
runtime with `?pip=canvas` in the URL — the only practical way to exercise the
mobile path on a desktop machine. Rename or disable that with
`forceParam="debugPip"` / `forceParam={false}`.

## Writing the canvas frame

`react-pip-anywhere/canvas` has the pieces canvas does not give you:

```ts
import { wrapText, ellipsize, roundedRectPath, fillSoft, readCssVars } from 'react-pip-anywhere/canvas';

const theme = readCssVars(document.documentElement, {
  surface: ['--surface', '#111318'],
  text: ['--text', '#eef0f3'],
  accent: ['--accent', '#a3e635'],
});

function drawFrame(ctx, items, width, height) {
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, width, height);

  ctx.font = '500 13px Inter, sans-serif';
  ctx.fillStyle = theme.text;
  wrapText(ctx, items[0].title, width - 24, 2).forEach((line, i) => {
    ctx.fillText(line, 12, 20 + i * 16);
  });
}
```

Reading the colours back from CSS custom properties means the frame follows a
light/dark switch without a second palette to keep in step.

Things worth knowing:

- The context is already scaled by `scale` (2 by default), so draw in logical
  units. The canvas backing store — and therefore the video resolution — is
  `size × scale`.
- The frame is cleared before each `render`, so nothing ghosts.
- `data` is mirrored into a ref and handed to `render`, and `now` is the paint
  time. Use them rather than closing over props: once the tab is hidden React
  stops rendering and the frame is driven by a bare timer.
- **Do not draw cross-origin images.** A tainted canvas makes `captureStream()`
  throw `SecurityError`, which breaks the whole strategy. Proxy the image through
  your own origin, or leave it out.
- Android only accepts aspect ratios between 1:2.39 and 2.39:1. Outside that the
  package warns and the request will probably be refused.

## The Satori path

`react-pip-anywhere/satori` lets you describe the frame as flexbox instead of
coordinates, via [Satori](https://github.com/vercel/satori):

```tsx
import { createSatoriRenderer, loadFont } from 'react-pip-anywhere/satori';
import yogaWasm from 'satori/yoga.wasm?url';

const font = await loadFont('/fonts/inter-latin-400-normal.woff', { name: 'Inter' });

const render = createSatoriRenderer({
  fonts: [font],
  yogaWasm,
  background: '#111318',
  view: ({ data, now }) => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {data.map((item) => (
        <div key={item.id} style={{ display: 'flex', fontSize: 13 }}>{item.title}</div>
      ))}
    </div>
  ),
});
```

Read this part before choosing it:

- **Satori does not run React and ignores `className`.** It reads an element tree
  with inline `style` props and supports a flexbox subset. You cannot pass your
  existing styled component through it — `view` is a second, simpler view of the
  same data. What you gain over drawing by hand is declarative layout, not reuse.
- **It needs a real font file as an `ArrayBuffer`**, in TTF, OTF or WOFF. Not
  WOFF2, which is what Google Fonts serves modern browsers. `loadFont` fetches one
  and tells you if you pointed it at a WOFF2.
- **It is about a megabyte**: ~450 KB of JavaScript plus ~1 MB of WebAssembly
  across Yoga (layout) and harfbuzz (text shaping). Import the subpath lazily.
- **Its layout engine is WebAssembly and must be initialised in the browser.**
  Pass `yogaWasm` (as above) or call `initSatori(url)` once at startup.
- **harfbuzz fetches `hb.wasm` from beside its own JavaScript**, which no bundler
  carries along for it. Your app has to serve that file. For Vite:

  ```ts
  // vite.config.ts — dev middleware plus a build-time copy.
  // The full plugin is in demo/vite.config.ts in this repo.
  ```

- Satori is asynchronous and `render` is not, so the renderer draws the most
  recent frame it managed to rasterise and asks for one more paint when the next
  lands. The visible lag is the rasterisation time, not a frame interval.

The hand-written `render(ctx)` path stays the recommended default. Satori is the
ergonomic alternative, not the upgrade.

## Running in the background

This is the part with no clean answer, and the reason the frame should carry a
clock or some other liveness tell.

A hidden tab has no `requestAnimationFrame`, so the frame is driven by a timer.
Chrome clamps a hidden page's timers to one tick per second, and to one per
minute after five minutes hidden. Hosting a picture-in-picture video exempts the
page from being frozen outright, but not from that clamping.

An inaudible audio track in the captured stream buys back the looser budget,
because a page playing audio is exempt. It also takes Android's audio focus and
pauses whatever the user is listening to. That trade is yours to make:

```tsx
canvas={{ ..., keepAliveAudio: true }}
```

It is off by default.

## API

### `<PictureInPicture>` / `usePictureInPicture()`

Both take the same options. The component renders the capture stage, the floating
widget and the portal for you; the hook hands you the pieces to render yourself.

| Option | Default | |
|---|---|---|
| `open` | — | Desired state. Flip it from a click handler. |
| `onOpenChange` | — | Called when the user or the OS closes the window, and when no strategy could be opened. |
| `onModeChange` | — | The strategy that actually won: `'closed' \| 'document' \| 'canvas' \| 'inline'`. |
| `strategy` | `['document', 'canvas', 'inline']` | Fallback order. |
| `documentWindow` | `{ size: 380×560 }` | `size`, `copyStyles`, `css`, `title`, `lang`, `mirrorAttributes` (default `['data-theme']`). |
| `canvas` | — | `size`, `scale` (2), `fps` (1), `data`, `render`, `keepAliveAudio` (false). Omit to disable. |
| `inline` | `{ size: 340×460 }` | `size`, `draggable` (true), `positionStorageKey`, `pinBelowWidth` (640), `defaultPlacement` (true), `zIndex`. |
| `forceParam` | `'pip'` | Query parameter that forces a strategy. |
| `platform` | real browser APIs | Test seam. |

The component also takes `children` (a node, or a function given `{ mode, dragHandleProps }`),
`controls`, `className` and `controlsClassName`.

The hook returns `{ mode, isOpen, open, close, toggle, pipWindow, stage, inline }`.

### Styling

Nothing ships a stylesheet. The package applies inline styles only for what is
functional — keeping the capture stage off screen, and `position: fixed` plus the
drag offsets on the floating widget — and marks its parts with
`data-pip-part="stage" | "inline" | "controls"` and `data-pip-mode`. Style them
with `className` and your own CSS.

The floating widget sits bottom-right by default and remembers where it was
dragged if you give it `positionStorageKey`. If your own stylesheet places it,
pass `defaultPlacement: false` — an inline `right`/`bottom` would otherwise beat
your media queries. Below `pinBelowWidth` it stops being
draggable and drops the stored position, because on a phone a saved offset only
pushes it off screen.

### Gotchas the package handles for you

- The capture `<canvas>` and `<video>` are mounted as soon as a canvas renderer is
  configured, even while closed: a detached video cannot enter picture-in-picture
  and a `display: none` one is refused.
- A PiP window and a PiP video both outlive the React tree, so both are torn down
  on unmount.
- `leavepictureinpicture` and `pagehide` report back through `onOpenChange`, so
  closing from the OS chrome keeps your button in step.

## Development

```bash
npm install
npm run demo          # the demo app, which is also the on-device test vehicle
npm test              # unit suite (happy-dom)
npm run test:browser  # browser suite (real Chrome via Playwright)
npm run build
```

The browser suite uses whatever Chrome is on `CHROME_PATH`, defaulting to
`/usr/bin/google-chrome`, rather than downloading Playwright's own build.

Picture-in-picture needs HTTPS, so testing on a real Android device means
deploying the demo somewhere — GitHub Pages is enough.

## License

MIT
