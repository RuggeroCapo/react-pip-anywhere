/**
 * `requestPictureInPicture()` throws while the element has no decoded frame yet,
 * and a canvas stream at rate 0 only produces one when asked, so the open sequence
 * has to wait for it explicitly.
 */
export function waitForVideoData(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  if (video.readyState >= 2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let timeout = 0;

    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener('loadeddata', handleReady);
      video.removeEventListener('error', handleError);
    };
    const handleReady = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('video element failed to load the canvas stream'));
    };

    video.addEventListener('loadeddata', handleReady);
    video.addEventListener('error', handleError);
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error('timed out waiting for the canvas stream'));
    }, timeoutMs) as unknown as number;
  });
}

/**
 * A picture-in-picture document starts empty: no stylesheet, no theme. Cloning the
 * opener's style nodes is what makes the portaled React tree look like itself.
 */
export function copyStylesInto(source: Document, target: Document, extraCss?: string): void {
  source.querySelectorAll<HTMLElement>('style, link[rel="stylesheet"]').forEach((node) => {
    target.head.appendChild(node.cloneNode(true));
  });

  if (extraCss) {
    const style = target.createElement('style');
    style.textContent = extraCss;
    target.head.appendChild(style);
  }
}

/**
 * Keeps chosen attributes on the PiP document's `<html>` in step with the opener's,
 * so a theme toggle in the page follows the window. Returns a disposer.
 */
export function mirrorHtmlAttributes(
  source: HTMLElement,
  target: HTMLElement,
  attributes: readonly string[]
): () => void {
  const sync = () => {
    attributes.forEach((name) => {
      const value = source.getAttribute(name);
      if (value === null) target.removeAttribute(name);
      else target.setAttribute(name, value);
    });
  };

  sync();
  const observer = new MutationObserver(sync);
  observer.observe(source, { attributes: true, attributeFilter: [...attributes] });
  return () => observer.disconnect();
}

export function clampToViewport(
  win: Window,
  x: number,
  y: number,
  size: { width: number; height: number },
  margin = 8
): { x: number; y: number } {
  const maxX = Math.max(margin, win.innerWidth - size.width - margin);
  const maxY = Math.max(margin, win.innerHeight - size.height - margin);
  return {
    x: Math.min(Math.max(margin, x), maxX),
    y: Math.min(Math.max(margin, y), maxY),
  };
}
