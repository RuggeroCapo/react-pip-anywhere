import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { PictureInPicture } from '../src/PictureInPicture';
import type {
  CanvasStrategyOptions,
  InlineStrategyOptions,
  PipMode,
  PipPlatform,
  PipStrategy,
} from '../src/types';
import { CAPABILITIES, createFakePlatform, stubCanvasEnvironment } from './helpers';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

const CANVAS_OPTIONS: CanvasStrategyOptions<number> = {
  size: { width: 360, height: 540 },
  data: 1,
  render: () => {},
};

let container: HTMLDivElement;
let root: Root;
let setOpen: (open: boolean) => void;
let restoreCanvasEnv: () => void;

function Harness(props: {
  platform: PipPlatform;
  onModeChange: (mode: PipMode) => void;
  canvas?: CanvasStrategyOptions<number>;
  strategy?: readonly PipStrategy[];
  inline?: InlineStrategyOptions;
}) {
  const [open, setOpenState] = useState(false);
  setOpen = setOpenState;
  return (
    <PictureInPicture<number>
      open={open}
      onOpenChange={setOpenState}
      onModeChange={props.onModeChange}
      platform={props.platform}
      canvas={props.canvas}
      strategy={props.strategy}
      inline={props.inline}
      forceParam={false}
    >
      <p data-testid="panel">panel</p>
    </PictureInPicture>
  );
}

async function mount(props: Parameters<typeof Harness>[0]) {
  await act(async () => {
    root.render(<Harness {...props} />);
  });
}

async function setOpenTo(value: boolean) {
  await act(async () => {
    setOpen(value);
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  restoreCanvasEnv = stubCanvasEnvironment();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  restoreCanvasEnv();
});

describe('strategy selection', () => {
  it('opens a document window on Chromium desktop', async () => {
    const onModeChange = vi.fn();
    const platform = createFakePlatform(CAPABILITIES.chromeDesktop);
    await mount({ platform, onModeChange, canvas: CANVAS_OPTIONS });

    await setOpenTo(true);

    expect(onModeChange).toHaveBeenLastCalledWith('document');
    expect(platform.openDocumentWindow).toHaveBeenCalledOnce();
    expect(platform.enteredVideoPip).toBe(false);
  });

  it('falls to the canvas strategy on Chrome for Android', async () => {
    const onModeChange = vi.fn();
    const platform = createFakePlatform(CAPABILITIES.chromeAndroid);
    await mount({ platform, onModeChange, canvas: CANVAS_OPTIONS });

    await setOpenTo(true);

    expect(onModeChange).toHaveBeenLastCalledWith('canvas');
    expect(platform.openDocumentWindow).not.toHaveBeenCalled();
    expect(platform.captureCanvas).toHaveBeenCalledOnce();
    expect(platform.enteredVideoPip).toBe(true);
  });

  it('parks the widget bottom-right by default, and leaves it to CSS on request', async () => {
    const platform = createFakePlatform(CAPABILITIES.firefox);
    await mount({ platform, onModeChange: vi.fn() });
    await setOpenTo(true);

    const parked = container.querySelector('[data-pip-part="inline"]') as HTMLElement;
    expect(parked.style.right).not.toBe('');
    expect(parked.style.bottom).not.toBe('');

    await mount({
      platform: createFakePlatform(CAPABILITIES.firefox),
      onModeChange: vi.fn(),
      inline: { defaultPlacement: false },
    });
    await setOpenTo(true);

    const free = container.querySelector('[data-pip-part="inline"]') as HTMLElement;
    expect(free.style.right).toBe('');
    expect(free.style.bottom).toBe('');
    expect(free.style.position).toBe('fixed');
  });

  it('falls all the way to the in-page widget on Firefox', async () => {
    const onModeChange = vi.fn();
    const platform = createFakePlatform(CAPABILITIES.firefox);
    await mount({ platform, onModeChange, canvas: CANVAS_OPTIONS });

    await setOpenTo(true);

    expect(onModeChange).toHaveBeenLastCalledWith('inline');
    expect(container.querySelector('[data-pip-part="inline"]')).not.toBeNull();
  });

  it('degrades to canvas when the document window is refused', async () => {
    const onModeChange = vi.fn();
    const platform = createFakePlatform(CAPABILITIES.chromeDesktop, { document: true });
    await mount({ platform, onModeChange, canvas: CANVAS_OPTIONS });

    await setOpenTo(true);

    expect(platform.openDocumentWindow).toHaveBeenCalledOnce();
    expect(onModeChange).toHaveBeenLastCalledWith('canvas');
  });

  it('skips the canvas strategy when no renderer was configured', async () => {
    const onModeChange = vi.fn();
    const platform = createFakePlatform(CAPABILITIES.chromeAndroid);
    await mount({ platform, onModeChange });

    await setOpenTo(true);

    expect(platform.captureCanvas).not.toHaveBeenCalled();
    expect(onModeChange).toHaveBeenLastCalledWith('inline');
  });

  it('gives up and reports closed when the order excludes everything supported', async () => {
    const onModeChange = vi.fn();
    const platform = createFakePlatform(CAPABILITIES.safari);
    await mount({ platform, onModeChange, canvas: CANVAS_OPTIONS, strategy: ['document'] });

    await setOpenTo(true);

    expect(onModeChange).toHaveBeenLastCalledWith('closed');
  });
});

describe('the capture stage', () => {
  it('is mounted before anything is opened, because PiP refuses a detached video', async () => {
    const platform = createFakePlatform(CAPABILITIES.chromeAndroid);
    await mount({ platform, onModeChange: vi.fn(), canvas: CANVAS_OPTIONS });

    expect(container.querySelector('[data-pip-part="stage"] video')).not.toBeNull();
    expect(container.querySelector('[data-pip-part="stage"] canvas')).not.toBeNull();
  });

  it('is left out when the canvas strategy is not configured', async () => {
    const platform = createFakePlatform(CAPABILITIES.chromeAndroid);
    await mount({ platform, onModeChange: vi.fn() });

    expect(container.querySelector('[data-pip-part="stage"]')).toBeNull();
  });
});

describe('closing', () => {
  it('closes the document window and reports closed', async () => {
    const onModeChange = vi.fn();
    const platform = createFakePlatform(CAPABILITIES.chromeDesktop);
    await mount({ platform, onModeChange, canvas: CANVAS_OPTIONS });

    await setOpenTo(true);
    await setOpenTo(false);

    expect(platform.pipWindow.closed).toBe(true);
    expect(onModeChange).toHaveBeenLastCalledWith('closed');
  });

  it('stops the capture tracks and leaves video PiP', async () => {
    const platform = createFakePlatform(CAPABILITIES.chromeAndroid);
    await mount({ platform, onModeChange: vi.fn(), canvas: CANVAS_OPTIONS });

    await setOpenTo(true);
    await setOpenTo(false);

    expect(platform.exitVideoPip).toHaveBeenCalled();
    expect(platform.tracksStopped).toBe(1);
  });

  it('follows the user closing the PiP window from the OS chrome', async () => {
    const onModeChange = vi.fn();
    const platform = createFakePlatform(CAPABILITIES.chromeAndroid);
    await mount({ platform, onModeChange, canvas: CANVAS_OPTIONS });

    await setOpenTo(true);
    const video = container.querySelector('video') as HTMLVideoElement;

    await act(async () => {
      video.dispatchEvent(new Event('leavepictureinpicture'));
    });

    expect(onModeChange).toHaveBeenLastCalledWith('closed');
  });

  it('tears the session down when the tree unmounts', async () => {
    const platform = createFakePlatform(CAPABILITIES.chromeDesktop);
    await mount({ platform, onModeChange: vi.fn(), canvas: CANVAS_OPTIONS });
    await setOpenTo(true);

    await act(async () => {
      root.render(<></>);
    });

    expect(platform.pipWindow.closed).toBe(true);
  });
});
