import { afterEach, describe, expect, it } from 'vitest';
import { detectCapabilities } from '../../src/capabilities';
import { waitForVideoData } from '../../src/dom';
import { defaultPlatform } from '../../src/platform';

const SIZE = { width: 720, height: 1080 };
const created: HTMLElement[] = [];

function attach<T extends HTMLElement>(element: T): T {
  created.push(element);
  document.body.append(element);
  return element;
}

function paintedCanvas(): HTMLCanvasElement {
  const canvas = attach(document.createElement('canvas'));
  canvas.width = SIZE.width;
  canvas.height = SIZE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.fillStyle = '#111318';
  ctx.fillRect(0, 0, SIZE.width, SIZE.height);
  return canvas;
}

afterEach(() => {
  created.splice(0).forEach((element) => element.remove());
});

describe('the canvas capture pipeline', () => {
  it('is reported as available in a real browser', () => {
    expect(detectCapabilities(window).canvasCapture).toBe(true);
  });

  it('feeds a video element from a canvas at capture rate 0', async () => {
    const canvas = paintedCanvas();
    const capture = defaultPlatform.captureCanvas(canvas);
    // Rate 0 emits nothing on its own, so the first frame has to be asked for.
    capture.requestFrame();

    const video = attach(document.createElement('video'));
    video.muted = true;
    video.playsInline = true;
    video.srcObject = capture.stream;

    await video.play();
    await waitForVideoData(video, 5000);

    expect(video.readyState).toBeGreaterThanOrEqual(2);
    expect(video.videoWidth).toBe(SIZE.width);
    expect(video.videoHeight).toBe(SIZE.height);

    capture.stream.getTracks().forEach((track) => track.stop());
  });

  it('keeps producing frames after the canvas is repainted', async () => {
    const canvas = paintedCanvas();
    const capture = defaultPlatform.captureCanvas(canvas);
    capture.requestFrame();

    const video = attach(document.createElement('video'));
    video.muted = true;
    video.playsInline = true;
    video.srcObject = capture.stream;
    await video.play();
    await waitForVideoData(video, 5000);

    const ctx = canvas.getContext('2d');
    ctx!.fillStyle = '#a3e635';
    ctx!.fillRect(0, 0, 100, 100);
    capture.requestFrame();

    const track = capture.stream.getVideoTracks()[0];
    expect(track?.readyState).toBe('live');

    capture.stream.getTracks().forEach((t) => t.stop());
    expect(track?.readyState).toBe('ended');
  });

  it('times out instead of hanging when no frame ever arrives', async () => {
    const video = attach(document.createElement('video'));
    await expect(waitForVideoData(video, 50)).rejects.toThrow(/timed out/);
  });
});
