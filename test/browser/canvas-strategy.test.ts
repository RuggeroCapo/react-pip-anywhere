import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { startCanvasPip } from '../../src/strategies/canvas';
import { defaultPlatform } from '../../src/platform';
import type { CanvasSession } from '../../src/strategies/canvas';

const SIZE = { width: 180, height: 270 };
const SCALE = 2;

let session: CanvasSession | null = null;
const created: HTMLElement[] = [];

function attach<T extends HTMLElement>(element: T): T {
  created.push(element);
  document.body.append(element);
  return element;
}

afterEach(() => {
  session?.dispose();
  session = null;
  created.splice(0).forEach((element) => element.remove());
});

/**
 * `requestPictureInPicture()` needs a real user gesture, so the whole open
 * sequence is kicked off from an actual click rather than called directly.
 */
async function start(render = vi.fn(), onLeave = vi.fn()) {
  const canvas = attach(document.createElement('canvas'));
  const video = attach(document.createElement('video'));
  video.playsInline = true;

  const button = attach(document.createElement('button'));
  button.textContent = 'open';

  let opening: Promise<CanvasSession> | null = null;
  button.addEventListener('click', () => {
    opening = startCanvasPip({
      platform: defaultPlatform,
      win: window,
      canvas,
      video,
      size: SIZE,
      scale: SCALE,
      fps: 1,
      keepAliveAudio: false,
      render,
      getData: () => 'payload',
      onLeave,
    });
  });

  await userEvent.click(button);
  if (!opening) throw new Error('the click handler never ran');
  session = await opening;

  return { canvas, video, render, onLeave };
}

describe('the canvas strategy end to end', () => {
  it('paints, captures and puts the video into picture-in-picture', async () => {
    const render = vi.fn((ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(0, 0, SIZE.width, SIZE.height);
    });

    const { canvas, video } = await start(render);

    // The backing store is the real video resolution.
    expect(canvas.width).toBe(SIZE.width * SCALE);
    expect(canvas.height).toBe(SIZE.height * SCALE);
    expect(video.videoWidth).toBe(SIZE.width * SCALE);
    expect(document.pictureInPictureElement).toBe(video);

    // The context handed to `render` is pre-scaled, so logical units cover it all.
    const ctx = canvas.getContext('2d');
    const [r, g, b] = Array.from(
      ctx!.getImageData(SIZE.width * SCALE - 2, SIZE.height * SCALE - 2, 1, 1).data
    );
    expect([r, g, b]).toEqual([0xa3, 0xe6, 0x35]);
  });

  it('hands the renderer live data and a working repaint request', async () => {
    const seen: string[] = [];
    let asked = false;
    const render = vi.fn((_ctx: CanvasRenderingContext2D, info: { data: string; requestRepaint: () => void }) => {
      seen.push(info.data);
      if (!asked) {
        asked = true;
        info.requestRepaint();
      }
    });

    await start(render as never);

    expect(seen.every((value) => value === 'payload')).toBe(true);
    // One paint before capture, one after the requestRepaint it triggered.
    expect(render.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('clears the frame between paints so nothing ghosts', async () => {
    let pass = 0;
    const render = vi.fn((ctx: CanvasRenderingContext2D) => {
      pass += 1;
      if (pass === 1) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, SIZE.width, SIZE.height);
      }
    });

    const { canvas } = await start(render);
    session?.paint();

    const ctx = canvas.getContext('2d');
    expect(Array.from(ctx!.getImageData(4, 4, 1, 1).data)[3]).toBe(0);
  });

  it('leaves picture-in-picture and stops the tracks on dispose', async () => {
    const { video } = await start();
    const stream = video.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];

    session?.dispose();
    session = null;

    expect(track?.readyState).toBe('ended');
    expect(video.srcObject).toBeNull();
    // exitPictureInPicture is async; the element clears once it settles.
    await vi.waitFor(() => expect(document.pictureInPictureElement).toBeNull());
  });

  it('stops repainting after dispose', async () => {
    const render = vi.fn();
    await start(render);
    session?.dispose();
    const callsAtDispose = render.mock.calls.length;
    session?.paint();
    session = null;

    expect(render.mock.calls.length).toBe(callsAtDispose);
  });
});
