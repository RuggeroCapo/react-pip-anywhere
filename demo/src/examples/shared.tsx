import type { ReactNode } from 'react';
import type { PipMode } from '../../../src/types';

/**
 * The honest sentence for each strategy: what it is, and what it costs. The
 * readout is the point of the demo, so the wording here matches the strategy
 * fields further down the page.
 */
export const MODE_NOTES: Record<PipMode, string> = {
  closed: 'Nothing is open. The strategy gets picked the moment you press the button, because opening needs a user gesture.',
  document:
    'A real operating-system window running its own document, with the React tree portaled into it. Everything inside stays live and clickable.',
  canvas:
    'The frame is painted to a canvas, captured as a MediaStream and played by a hidden video. It is a picture, so the controls have to stay down here.',
  inline:
    'This browser has no picture-in-picture at all, so the panel is a floating widget pinned in the page. Drag it by its header.',
};

type Props = {
  title: string;
  tagline: string;
  badges: string[];
  mode: PipMode;
  open: boolean;
  onToggle: () => void;
  extraControls?: ReactNode;
  /** Whatever the example wants to keep visible in the page itself. */
  aside: ReactNode;
  /** The props this example actually passes, trimmed to what matters. */
  code: string;
  children: ReactNode;
};

/** The common chrome around every example: title, badges, controls, mode readout. */
export function ExampleFrame({
  title,
  tagline,
  badges,
  mode,
  open,
  onToggle,
  extraControls,
  aside,
  code,
  children,
}: Props) {
  return (
    <section className="example">
      <div className="example-main">
        <div className="example-heading">
          <h3 className="example-title">{title}</h3>
          <div className="badges">
            {badges.map((badge) => (
              <span key={badge} className="badge">
                {badge}
              </span>
            ))}
          </div>
        </div>

        <p className="example-tagline">{tagline}</p>

        <div className="controls">
          <button type="button" className="btn btn-primary" onClick={onToggle}>
            {open ? 'Close the window' : 'Open picture-in-picture'}
          </button>
          {extraControls}
        </div>

        <div className="mode-readout">
          <span className="mode-key">Strategy</span>
          <span className="mode-value" data-mode={mode}>
            <span className="mode-mark" aria-hidden="true" />
            {mode}
          </span>
          <p className="mode-note" role="status">
            {MODE_NOTES[mode]}
          </p>
        </div>

        {children}

        <div className="example-code">
          <span className="aside-label">The props behind it</span>
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      </div>

      <div className="example-aside">{aside}</div>
    </section>
  );
}
