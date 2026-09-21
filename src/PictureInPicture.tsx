'use client';

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { usePictureInPicture } from './use-picture-in-picture';
import type { PictureInPictureRenderState, UsePictureInPictureOptions } from './use-picture-in-picture';
import type { PipMode } from './types';

export type PictureInPictureProps<TData = unknown> = UsePictureInPictureOptions<TData> & {
  /**
   * The panel itself. In `document` mode it is portaled into the PiP window and
   * stays fully interactive; in `inline` mode it renders in the floating widget.
   * In `canvas` mode it is not rendered at all — the frame comes from `render`.
   *
   * As a function it receives the live mode and the drag handle props to spread
   * onto whatever should move the inline widget.
   */
  children: ReactNode | ((state: PictureInPictureRenderState) => ReactNode);
  /**
   * Rendered in the page while `canvas` mode is active. A video picture-in-picture
   * frame is an image, so anything the user must be able to press has to live here.
   */
  controls?: ReactNode;
  className?: string;
  controlsClassName?: string;
};

/**
 * Puts `children` in picture-in-picture, picking the best strategy this browser
 * supports and falling back in order.
 *
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <button onClick={() => setOpen((v) => !v)}>PiP</button>
 * <PictureInPicture open={open} onOpenChange={setOpen} canvas={{ size, data, render }}>
 *   <Panel />
 * </PictureInPicture>
 * ```
 */
export function PictureInPicture<TData = unknown>(props: PictureInPictureProps<TData>) {
  const { children, controls, className, controlsClassName, ...options } = props;
  const pip = usePictureInPicture<TData>(options);
  const { mode, stage, inline, pipWindow } = pip;

  const renderChildren = (currentMode: PipMode): ReactNode =>
    typeof children === 'function'
      ? children({ mode: currentMode, dragHandleProps: inline.handleProps })
      : children;

  return (
    <>
      {/*
        The capture surface stays mounted whenever the canvas strategy is
        configured: a detached video cannot enter picture-in-picture and a
        `display: none` one is refused, so it has to already be here when the
        user's click arrives.
      */}
      {stage.enabled && (
        <div style={stage.style} aria-hidden="true" data-pip-part="stage">
          <canvas ref={stage.canvasRef} />
          <video ref={stage.videoRef} playsInline />
        </div>
      )}

      {mode === 'inline' && (
        <div
          ref={inline.ref}
          style={inline.style}
          className={className}
          data-pip-part="inline"
          data-pip-mode="inline"
        >
          {renderChildren('inline')}
        </div>
      )}

      {mode === 'canvas' && controls && (
        <div className={controlsClassName} data-pip-part="controls" data-pip-mode="canvas">
          {controls}
        </div>
      )}

      {mode === 'document' && pipWindow
        ? createPortal(renderChildren('document'), pipWindow.document.body)
        : null}
    </>
  );
}
