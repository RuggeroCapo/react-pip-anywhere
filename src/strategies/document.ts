import { copyStylesInto, mirrorHtmlAttributes } from '../dom';
import type { DocumentStrategyOptions, PipPlatform, Size } from '../types';

export const DEFAULT_DOCUMENT_SIZE: Size = { width: 380, height: 560 };

export type DocumentSession = {
  window: Window;
  dispose: () => void;
};

/**
 * Opens a Document Picture-in-Picture window and dresses it so a portaled React
 * tree looks the same as it did in the page. The caller portals into
 * `session.window.document.body`.
 */
export async function startDocumentPip(
  win: Window,
  platform: PipPlatform,
  options: DocumentStrategyOptions,
  onClosed: () => void
): Promise<DocumentSession> {
  const size = options.size ?? DEFAULT_DOCUMENT_SIZE;
  const pip = await platform.openDocumentWindow(win, size);
  const doc = pip.document;

  if (options.copyStyles !== false) {
    copyStylesInto(win.document, doc, options.css);
  } else if (options.css) {
    const style = doc.createElement('style');
    style.textContent = options.css;
    doc.head.appendChild(style);
  }

  if (options.title) doc.title = options.title;
  if (options.lang) doc.documentElement.lang = options.lang;

  const mirrored = options.mirrorAttributes ?? ['data-theme'];
  const stopMirroring = mirrored.length
    ? mirrorHtmlAttributes(win.document.documentElement, doc.documentElement, mirrored)
    : () => {};

  // The window has its own close button, and it outlives the React tree that
  // opened it, so this is the authoritative signal that it is gone.
  pip.addEventListener('pagehide', onClosed);

  return {
    window: pip,
    dispose: () => {
      stopMirroring();
      pip.removeEventListener('pagehide', onClosed);
      pip.close();
    },
  };
}
