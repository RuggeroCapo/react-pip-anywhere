import { waitForVideoData } from '../dom';
import type { CanvasCapture, CanvasRenderer, PipPlatform, Size } from '../types';

export const DEFAULT_CANVAS_SCALE = 2;
export const DEFAULT_CANVAS_FPS = 1;
export const VIDEO_READY_TIMEOUT_MS = 3000;

/** Android refuses picture-in-picture outside this range. */
const MIN_ASPECT = 1 / 2.39;
const MAX_ASPECT = 2.39;

export type CanvasSession = {
  /** Repaints and pushes one frame. Safe to call from a React effect. */
  paint: () => void;
  dispose: () => void;
};

export type StartCanvasPipArgs<TData> = {
  platform: PipPlatform;
  win: Window;
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  size: Size;
  scale: number;
  fps: number;
  keepAliveAudio: boolean;
  render: CanvasRenderer<TData>;
  getData: () => TData;
  onLeave: () => void;
};

let warnedAboutAspectRatio = false;

export function warnOnBadAspectRatio(size: Size): void {
  const aspect = size.width / size.height;
  if (aspect >= MIN_ASPECT && aspect <= MAX_ASPECT) return;
  if (warnedAboutAspectRatio) return;
  warnedAboutAspectRatio = true;
  console.warn(
    `[react-pip-anywhere] canvas.size aspect ratio ${aspect.toFixed(2)} is outside ` +
      "Android's supported picture-in-picture range (1:2.39 to 2.39:1); the request may be refused."
  );
}

/**
 * The mobile path: paint into a canvas, capture it as a stream, play that stream
 * in a hidden video and put the video into picture-in-picture.
 *
 * The video and canvas must already be in the document — a detached video cannot
 * enter PiP and a `display: none` one is refused — and this must be called inside
 * the user gesture that asked for it.
 */
export async function startCanvasPip<TData>(
  args: StartCanvasPipArgs<TData>
): Promise<CanvasSession> {
  const { platform, win, canvas, video, size, scale, fps, render, getData, onLeave } = args;

  warnOnBadAspectRatio(size);

  canvas.width = Math.round(size.width * scale);
  canvas.height = Math.round(size.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('could not get a 2d context for the picture-in-picture canvas');

  let capture: CanvasCapture | null = null;

  let disposed = false;

  const paint = () => {
    if (disposed) return;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    render(ctx, {
      data: getData(),
      width: size.width,
      height: size.height,
      scale,
      now: Date.now(),
      requestRepaint: () => {
        if (!disposed) paint();
      },
    });
    ctx.restore();
    capture?.requestFrame();
  };

  // A frame has to exist before the capture starts, or the video never gets
  // metadata and `requestPictureInPicture()` throws.
  paint();
  capture = platform.captureCanvas(canvas);
  capture.requestFrame();

  const audio = args.keepAliveAudio ? platform.createSilentAudioTrack(win) : null;
  if (audio) capture.stream.addTrack(audio.track);

  // Muted unless there is a keep-alive track to keep alive: an unmuted element
  // takes Android's audio focus even when what it plays is inaudible.
  video.muted = !audio;
  video.srcObject = capture.stream;

  let timer = 0;

  const dispose = () => {
    disposed = true;
    if (timer) win.clearInterval(timer);
    timer = 0;
    video.removeEventListener('leavepictureinpicture', onLeave);
    void platform.exitVideoPip(video);
    video.pause();
    capture?.stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
    audio?.close();
    capture = null;
  };

  try {
    await video.play();
    await waitForVideoData(video, VIDEO_READY_TIMEOUT_MS);
    await platform.enterVideoPip(video);
  } catch (error) {
    dispose();
    throw error;
  }

  video.addEventListener('leavepictureinpicture', onLeave);

  // Once the tab is hidden React stops rendering, so the frame is driven by a
  // plain timer. Chrome clamps a hidden page to one tick per second, and to one
  // per minute after five minutes, unless `keepAliveAudio` bought the exemption.
  timer = win.setInterval(paint, Math.max(1, Math.round(1000 / fps)));

  return { paint, dispose };
}
