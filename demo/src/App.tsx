import { useCallback, useEffect, useRef, useState } from 'react';
import { EXAMPLES } from './examples/registry';
import type { ExampleId } from './examples/registry';

const THEME_KEY = 'demo.theme';

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Private mode and blocked storage both land here; the default is fine.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [activeId, setActiveId] = useState<ExampleId>(EXAMPLES[0]!.id);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Not being able to remember the choice is not a reason to refuse it.
    }
  }, [theme]);

  const active = EXAMPLES.find((example) => example.id === activeId) ?? EXAMPLES[0]!;
  const Active = active.Component;

  return (
    <>
      <a className="skip-link" href="#live">
        Skip to the live examples
      </a>

      <div className="page">
        <header className="masthead inner">
          <div className="meta">
            <span className="meta-name">react-pip-anywhere</span>
            <span className="meta-version">v0.1.0</span>
            <span>MIT</span>
            <span>React 18+</span>
            <span className="meta-push">
              <ThemeToggle theme={theme} onChange={setTheme} />
            </span>
          </div>

          <div className="stagger">
            <div className="masthead-top">
              <h1 className="wordmark">
                <span>Pip</span>
                <span>Any&#8209;</span>
                <span className="is-accent">where</span>
              </h1>

              <nav className="contents" aria-label="Contents">
                <span className="contents-label">Contents</span>
                <ol>
                  <li>
                    <a href="#live">
                      <span className="contents-no">01</span> Live examples
                    </a>
                  </li>
                  <li>
                    <a href="#strategies">
                      <span className="contents-no">02</span> Three strategies
                    </a>
                  </li>
                  <li>
                    <a href="#support">
                      <span className="contents-no">03</span> What each browser gets
                    </a>
                  </li>
                </ol>
              </nav>
            </div>

            <div className="masthead-foot">
              <p className="lead">
                Picture-in-picture is three unrelated APIs wearing one name, and no browser has all
                three. This is one React component that covers every one of them, falls back in a
                fixed order, and tells you on screen which path it took.
              </p>
              <Install />
            </div>
          </div>
        </header>

        <section className="band inner" id="live" aria-labelledby="live-title">
          <div className="band-head">
            <span className="band-no">01</span>
            <h2 className="band-title" id="live-title">
              Live
            </h2>
            <p className="band-note">
              These are running in your browser right now, on whichever strategy feature detection
              picked for it. Open one, then drag the window somewhere and switch tabs. Append{' '}
              <code>?pip=canvas</code> or <code>?pip=inline</code> to the URL to force a different
              path and watch the same component adapt.
            </p>
          </div>

          <ExampleTabs activeId={activeId} onChange={setActiveId} />

          <div
            className="stage"
            role="tabpanel"
            id={`panel-${active.id}`}
            aria-labelledby={`tab-${active.id}`}
            tabIndex={-1}
          >
            <Active key={active.id} />
          </div>
        </section>

        <section className="band" id="strategies" aria-labelledby="strategies-title">
          <div className="band-head inner">
            <span className="band-no">02</span>
            <h2 className="band-title" id="strategies-title">
              Three strategies
            </h2>
            <p className="band-note">
              Chosen by feature detection, never by user agent string. The order is yours to set with{' '}
              <code>strategy</code>; the default is the one below, top to bottom.
            </p>
          </div>
          <StrategyFields />
        </section>

        <section className="band inner" id="support" aria-labelledby="support-title">
          <div className="band-head">
            <span className="band-no">03</span>
            <h2 className="band-title" id="support-title">
              What each browser gets
            </h2>
            <p className="band-note">
              One row per platform, one strategy per row. There is no partial support and no
              asterisk: a platform either has the API or it does not.
            </p>
          </div>
          <SupportMatrix />
        </section>

        <footer className="colophon inner">
          <div>
            <h2>Install</h2>
            <ul>
              <li>
                <code>npm install react-pip-anywhere</code>
              </li>
              <li>
                <code>react-pip-anywhere/canvas</code> for frame helpers
              </li>
              <li>
                <code>react-pip-anywhere/satori</code> for flexbox frames
              </li>
            </ul>
          </div>
          <div>
            <h2>Reference</h2>
            <ul>
              <li>
                <a href="https://www.npmjs.com/package/react-pip-anywhere">Package on npm</a>
              </li>
              <li>
                <a href="https://developer.mozilla.org/docs/Web/API/Document_Picture-in-Picture_API">
                  Document Picture-in-Picture API
                </a>
              </li>
              <li>
                <a href="https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/requestPictureInPicture">
                  requestPictureInPicture()
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2>About this page</h2>
            <p>
              Also the on-device test vehicle. The canvas frames read their colours from the same CSS
              custom properties as the page, so flipping the theme above repaints them too. MIT
              licensed.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (next: Theme) => void }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => onChange(theme === 'dark' ? 'light' : 'dark')}
    >
      <span className="theme-swatch" aria-hidden="true" />
      {theme === 'dark' ? 'Dark' : 'Light'}
      <span className="visually-hidden"> theme, switch to {theme === 'dark' ? 'light' : 'dark'}</span>
    </button>
  );
}

const INSTALL_COMMAND = 'npm install react-pip-anywhere';

function Install() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
    } catch {
      // No clipboard permission: the command is selectable text either way.
    }
  };

  return (
    <div className="install">
      <div className="install-row">
        <code className="install-cmd">{INSTALL_COMMAND}</code>
        <button type="button" className="install-copy" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
          <span className="visually-hidden"> the install command</span>
        </button>
      </div>
      <p className="install-note">Zero dependencies · 5.6 kB min+gzip · Satori optional</p>
    </div>
  );
}

/** A real tablist: arrow keys move between the examples, Home and End jump. */
function ExampleTabs({
  activeId,
  onChange,
}: {
  activeId: ExampleId;
  onChange: (id: ExampleId) => void;
}) {
  const refs = useRef(new Map<ExampleId, HTMLButtonElement>());

  const focusAt = useCallback(
    (index: number) => {
      const next = EXAMPLES[(index + EXAMPLES.length) % EXAMPLES.length]!;
      onChange(next.id);
      refs.current.get(next.id)?.focus();
    },
    [onChange]
  );

  return (
    <div className="switch" role="tablist" aria-label="Examples">
      {EXAMPLES.map((example, index) => (
        <button
          key={example.id}
          ref={(node) => {
            if (node) refs.current.set(example.id, node);
            else refs.current.delete(example.id);
          }}
          type="button"
          role="tab"
          id={`tab-${example.id}`}
          aria-selected={example.id === activeId}
          aria-controls={`panel-${example.id}`}
          tabIndex={example.id === activeId ? 0 : -1}
          className="switch-item"
          onClick={() => onChange(example.id)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') focusAt(index + 1);
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') focusAt(index - 1);
            else if (event.key === 'Home') focusAt(0);
            else if (event.key === 'End') focusAt(EXAMPLES.length - 1);
            else return;
            event.preventDefault();
          }}
        >
          <span className="switch-no">{String(index + 1).padStart(2, '0')}</span>
          <span className="switch-name">{example.name}</span>
          <span className="switch-blurb">{example.blurb}</span>
        </button>
      ))}
    </div>
  );
}

const STRATEGIES = [
  {
    no: '01',
    id: 'document',
    where: 'Chrome, Edge and Chromium on the desktop',
    body: 'A real operating-system window running its own document. Your React tree is portaled into it, so every button still works, every stylesheet still applies, and state stays in one place.',
    limitTitle: 'What it costs',
    limit: 'Desktop Chromium only. Firefox, Safari and every mobile browser are out.',
  },
  {
    no: '02',
    id: 'canvas',
    where: 'Chrome on Android',
    body: 'Your frame is painted to a canvas, captured as a MediaStream, and played by a hidden video that enters the classic video picture-in-picture. Write it by hand or describe it as flexbox with Satori.',
    limitTitle: 'What it costs',
    limit: 'The result is a picture. Nothing in it can be pressed, so controls stay in the page, and Android only accepts aspect ratios between 1:2.39 and 2.39:1.',
  },
  {
    no: '03',
    id: 'inline',
    where: 'Firefox, Safari and iOS',
    body: 'No picture-in-picture of any kind exists here, so the panel becomes a draggable widget pinned inside the page. Same markup, same styles, same component, and it remembers where you left it.',
    limitTitle: 'What it costs',
    limit: 'It cannot leave the tab. iOS gets no canvas path either: WebKit refuses PiP for MediaStream-backed video.',
  },
] as const;

function StrategyFields() {
  return (
    <div className="fields">
      {STRATEGIES.map((strategy) => (
        <article key={strategy.id} className={`field field-${strategy.id}`}>
          <span className="field-no">{strategy.no}</span>
          <h3 className="field-name">{strategy.id}</h3>
          <p className="field-where">{strategy.where}</p>
          <p className="field-body">{strategy.body}</p>
          <p className="field-limit">
            <b>{strategy.limitTitle}</b>
            {strategy.limit}
          </p>
        </article>
      ))}
    </div>
  );
}

const MATRIX: { platform: string; strategy: 'document' | 'canvas' | 'inline' }[] = [
  { platform: 'Chrome / Edge desktop', strategy: 'document' },
  { platform: 'Chrome Android', strategy: 'canvas' },
  { platform: 'Firefox desktop', strategy: 'inline' },
  { platform: 'Firefox Android', strategy: 'inline' },
  { platform: 'Safari desktop', strategy: 'inline' },
  { platform: 'Safari and Chrome on iOS', strategy: 'inline' },
];

const COLUMNS = ['document', 'canvas', 'inline'] as const;

function SupportMatrix() {
  return (
    <>
      <div className="matrix-scroll">
        <table className="matrix">
          <caption>
            A filled square is the strategy that wins on that platform; a dash means the platform
            cannot run it at all.
          </caption>
          <thead>
            <tr>
              <th scope="col">Platform</th>
              {COLUMNS.map((column) => (
                <th scope="col" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.platform}>
                <th scope="row">{row.platform}</th>
                {COLUMNS.map((column) => (
                  <td key={column}>
                    {row.strategy === column ? (
                      <>
                        <span className={`mark mark-${column}`} aria-hidden="true" />
                        <span className="visually-hidden">{column}</span>
                      </>
                    ) : (
                      <>
                        <span className="mark mark-none" aria-hidden="true" />
                        <span className="visually-hidden">not available</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="matrix-foot">
        Detection is by capability, never by user agent. iOS has no{' '}
        <code>requestPictureInPicture</code>, WebKit refuses picture-in-picture for
        MediaStream-backed video, and it suspends the page in the background regardless, so there is
        no canvas path there and the package does not pretend otherwise.
      </p>
    </>
  );
}
