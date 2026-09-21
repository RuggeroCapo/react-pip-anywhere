import { useEffect, useRef, useState } from 'react';
import { PictureInPicture } from '../../../src/index';
import type { CanvasRenderer, PipMode } from '../../../src/types';
import { fillSoft, readCssVars } from '../../../src/canvas';
import { ExampleFrame } from './shared';

type Metrics = {
  history: number[];
  requests: number;
  latencyMs: number;
  errorRate: number;
};

const SIZE = { width: 360, height: 320 };
const WINDOW_SIZE = { width: 360, height: 358 };
const SANS = "'Archivo', system-ui, -apple-system, sans-serif";
const MONO = "'Spline Sans Mono', ui-monospace, monospace";
const HISTORY_LEN = 40;

const PALETTE = {
  surface: ['--surface', '#fffdfa'],
  surface2: ['--surface-2', '#ece8e0'],
  rule: ['--rule', 'rgba(25,20,14,0.14)'],
  text: ['--text', '#19140e'],
  text2: ['--text-2', '#58524b'],
  text3: ['--text-3', '#756f69'],
  accent: ['--accent', '#d83215'],
  tagAlert: ['--tag-alert', '#be1e00'],
} as const;

function nextMetrics(previous: Metrics): Metrics {
  const last = previous.history[previous.history.length - 1] ?? 50;
  const value = Math.min(100, Math.max(5, last + (Math.random() - 0.5) * 18));
  const history = [...previous.history, value].slice(-HISTORY_LEN);
  return {
    history,
    requests: Math.round(400 + Math.random() * 900),
    latencyMs: Math.round(40 + value * 3.5),
    errorRate: Math.max(0, Math.round((value - 70) * 0.4 * 10) / 10),
  };
}

function seedMetrics(): Metrics {
  let metrics: Metrics = { history: [], requests: 0, latencyMs: 0, errorRate: 0 };
  for (let i = 0; i < HISTORY_LEN; i += 1) metrics = nextMetrics(metrics);
  return metrics;
}

const CODE = `<PictureInPicture
  open={open}
  onOpenChange={setOpen}
  onModeChange={setMode}
  documentWindow={{ size: { width: 360, height: 358 }, title: 'Stats' }}
  canvas={{
    size: { width: 360, height: 320 },
    data: metrics,
    render: drawDashboard,
    fps: 1,
  }}
>
  {({ dragHandleProps }) => <StatsPanel metrics={metrics} {...dragHandleProps} />}
</PictureInPicture>`;

/**
 * A stats panel with a live chart — the use case people reach for PiP for most:
 * keep an eye on a number while doing something else. Canvas-only, no document
 * interactivity needed, so it is a good fit even on the mobile capture path.
 */
export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PipMode>('closed');
  const [metrics, setMetrics] = useState<Metrics>(() => seedMetrics());

  useEffect(() => {
    const timer = setInterval(() => setMetrics((current) => nextMetrics(current)), 1500);
    return () => clearInterval(timer);
  }, []);

  const render: CanvasRenderer<Metrics> = (ctx, info) => drawDashboard(ctx, info.data, info.width, info.height);

  return (
    <ExampleFrame
      title="Stats dashboard"
      tagline="A sparkline and live numbers on a timer. This is what most people actually want picture-in-picture for: keep one number in view while working on something else."
      badges={['document', 'canvas']}
      mode={mode}
      open={open}
      onToggle={() => setOpen((value) => !value)}
      code={CODE}
      aside={
        <>
          <span className="aside-label">Canvas frame, drawn in the page</span>
          <DashboardPreviewCanvas metrics={metrics} render={render} size={SIZE} />
          <p className="aside-hint">
            Nothing here is interactive, so the canvas strategy loses nothing. That is what makes a
            dashboard the best fit for the mobile path.
          </p>
        </>
      }
    >
      <PictureInPicture<Metrics>
        open={open}
        onOpenChange={setOpen}
        onModeChange={setMode}
        className="panel-shell dashboard-shell"
        controlsClassName="pip-controls"
        documentWindow={{
          size: WINDOW_SIZE,
          title: 'Stats',
          css: 'body { margin: 0 } .panel { height: 100vh; border: 0; border-radius: 0 }',
        }}
        canvas={{ size: SIZE, data: metrics, render, fps: 1 }}
        inline={{ positionStorageKey: 'demo.dashboard.position' }}
        controls={
          <>
            <span className="pip-controls-label">Dashboard is in picture-in-picture</span>
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </>
        }
      >
        {({ dragHandleProps }) => (
          <div className="panel">
            <div className="panel-header" {...dragHandleProps}>
              <span className="dot" />
              <strong>Stats</strong>
            </div>
            <DashboardPreviewCanvas metrics={metrics} render={render} size={SIZE} />
          </div>
        )}
      </PictureInPicture>
    </ExampleFrame>
  );
}

function DashboardPreviewCanvas({
  metrics,
  render,
  size,
}: {
  metrics: Metrics;
  render: CanvasRenderer<Metrics>;
  size: { width: number; height: number };
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.save();
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    render(ctx, {
      data: metrics,
      width: size.width,
      height: size.height,
      scale: 2,
      now: Date.now(),
      requestRepaint: () => {},
    });
    ctx.restore();
  }, [metrics, render, size]);

  return (
    <canvas
      ref={ref}
      width={size.width * 2}
      height={size.height * 2}
      style={{ width: size.width }}
      role="img"
      aria-label="Live preview of the stats frame the mobile strategy captures"
    />
  );
}

type Theme = ReturnType<typeof readCssVars<typeof PALETTE>>;

function drawDashboard(ctx: CanvasRenderingContext2D, metrics: Metrics, width: number, height: number) {
  const theme: Theme = readCssVars(document.documentElement, PALETTE);
  const pad = 16;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, width, height);

  const previousSpacing = ctx.letterSpacing;
  ctx.letterSpacing = '0.1em';
  ctx.font = `600 9.5px ${SANS}`;
  ctx.fillStyle = theme.text2;
  ctx.fillText('LOAD', pad, pad + 2);
  ctx.textAlign = 'right';
  ctx.fillText('LAST 40 SAMPLES', width - pad, pad + 2);
  ctx.textAlign = 'left';
  ctx.letterSpacing = previousSpacing;

  // Sparkline, sitting on its own baseline rule rather than in a rounded box.
  const chartTop = pad + 18;
  const chartH = 92;
  const chartW = width - pad * 2;
  const { history } = metrics;
  const max = Math.max(...history, 1);
  const pointAt = (value: number, index: number) => ({
    x: pad + (index / (HISTORY_LEN - 1)) * chartW,
    y: chartTop + chartH - (value / max) * chartH,
  });

  fillSoft(
    ctx,
    theme.accent,
    () => {
      ctx.beginPath();
      ctx.moveTo(pad, chartTop + chartH);
      history.forEach((value, index) => {
        const { x, y } = pointAt(value, index);
        ctx.lineTo(x, y);
      });
      ctx.lineTo(pad + chartW, chartTop + chartH);
      ctx.closePath();
      ctx.fill();
    },
    0.16
  );

  ctx.beginPath();
  history.forEach((value, index) => {
    const { x, y } = pointAt(value, index);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.fillStyle = theme.rule;
  ctx.fillRect(pad, chartTop + chartH, chartW, 1);

  // Three figures in one ruled row, divided by hairlines. Not three boxes.
  const figures: { label: string; value: string; alert?: boolean }[] = [
    { label: 'REQ/S', value: String(metrics.requests) },
    { label: 'LATENCY', value: `${metrics.latencyMs}ms` },
    { label: 'ERRORS', value: `${metrics.errorRate}%`, alert: metrics.errorRate > 5 },
  ];

  const rowTop = chartTop + chartH + 20;
  const colW = chartW / figures.length;

  figures.forEach((figure, index) => {
    const x = pad + index * colW;

    if (index > 0) {
      ctx.fillStyle = theme.rule;
      ctx.fillRect(x, rowTop, 1, 52);
    }

    const textX = index === 0 ? x : x + 12;

    ctx.letterSpacing = '0.1em';
    ctx.font = `600 9px ${SANS}`;
    ctx.fillStyle = theme.text2;
    ctx.fillText(figure.label, textX, rowTop + 10);
    ctx.letterSpacing = previousSpacing;

    ctx.font = `700 19px ${SANS}`;
    ctx.fillStyle = figure.alert ? theme.tagAlert : theme.text;
    ctx.fillText(figure.value, textX, rowTop + 34);
  });

  ctx.fillStyle = theme.rule;
  ctx.fillRect(pad, height - 26, chartW, 1);

  ctx.fillStyle = theme.text2;
  ctx.letterSpacing = '0.1em';
  ctx.font = `600 9.5px ${SANS}`;
  ctx.fillText('LIVE', pad, height - 13);
  ctx.letterSpacing = previousSpacing;

  // The clock is the one figure that has to hold a fixed width as it ticks.
  ctx.font = `500 9.5px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleTimeString([], { hour12: false }), width - pad, height - 13);
  ctx.textAlign = 'left';
}
