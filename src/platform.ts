import { detectCapabilities } from './capabilities';
import type { CanvasCapture, PipPlatform, SilentAudio, Size } from './types';

/**
 * Chrome drops hidden pages to one timer tick per minute after five minutes.
 * A page playing audio is exempt, so the tone is inaudible rather than digital
 * silence, which keep-alive heuristics are more likely to discard. The caller
 * decides whether this is worth taking Android's audio focus for.
 */
function createSilentAudioTrack(win: Window): SilentAudio | null {
  const audioGlobals = win as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioCtor = audioGlobals.AudioContext ?? audioGlobals.webkitAudioContext;
  if (!AudioCtor) return null;

  try {
    const context = new AudioCtor();
    void context.resume();
    const destination = context.createMediaStreamDestination();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.0001;
    oscillator.frequency.value = 440;
    oscillator.connect(gain).connect(destination);
    oscillator.start();

    const track = destination.stream.getAudioTracks()[0];
    if (!track) {
      void context.close();
      return null;
    }

    return {
      track,
      close: () => {
        try {
          oscillator.stop();
        } catch {
          // already stopped
        }
        void context.close().catch(() => {});
      },
    };
  } catch {
    return null;
  }
}

export const defaultPlatform: PipPlatform = {
  detect: detectCapabilities,

  openDocumentWindow(win: Window, size: Size): Promise<Window> {
    const api = win.documentPictureInPicture;
    if (!api) return Promise.reject(new Error('documentPictureInPicture unavailable'));
    return api.requestWindow({ width: size.width, height: size.height });
  },

  captureCanvas(canvas: HTMLCanvasElement): CanvasCapture {
    // Rate 0: frames go out only when asked, which keeps the encoder idle between
    // repaints instead of re-encoding an unchanged frame 30 times a second.
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
    if (!track) throw new Error('canvas produced no video track');
    return {
      stream,
      requestFrame: () => track.requestFrame(),
    };
  },

  enterVideoPip(video: HTMLVideoElement): Promise<void> {
    return video.requestPictureInPicture().then(() => undefined);
  },

  exitVideoPip(video: HTMLVideoElement): Promise<void> {
    const doc = video.ownerDocument;
    if (doc.pictureInPictureElement !== video) return Promise.resolve();
    return doc.exitPictureInPicture().catch(() => undefined);
  },

  createSilentAudioTrack,
};
