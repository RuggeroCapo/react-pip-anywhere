import { useEffect, useState } from 'react';
import { PictureInPicture } from '../../../src/index';
import type { CanvasRenderer, PipMode } from '../../../src/types';
import { readCssVars } from '../../../src/canvas';
import { ExampleFrame } from './shared';

type Task = { id: string; text: string; done: boolean };

const SEED_TASKS: Task[] = [
  { id: 't1', text: 'Review pull request #482', done: false },
  { id: 't2', text: 'Reply to design feedback', done: false },
  { id: 't3', text: 'Cut the release notes', done: true },
  { id: 't4', text: 'Update the status page', done: false },
];

const SIZE = { width: 320, height: 420 };
const SANS = "'Archivo', system-ui, -apple-system, sans-serif";

const PALETTE = {
  surface: ['--surface', '#fffdfa'],
  surface2: ['--surface-2', '#ece8e0'],
  paper: ['--paper', '#f7f4ee'],
  rule: ['--rule', 'rgba(25,20,14,0.14)'],
  border: ['--border', 'rgba(25,20,14,0.24)'],
  text: ['--text', '#19140e'],
  text2: ['--text-2', '#58524b'],
  text3: ['--text-3', '#756f69'],
  accent: ['--accent', '#d83215'],
} as const;

const CODE = `<PictureInPicture
  open={open}
  onOpenChange={setOpen}
  onModeChange={setMode}
  documentWindow={{ size: { width: 320, height: 420 }, title: 'Checklist' }}
  canvas={{ size: { width: 320, height: 420 }, data: tasks, render: drawChecklist }}
>
  {({ mode }) => (
    // The add-a-task form only exists where the window is interactive.
    <TaskList tasks={tasks} onToggle={toggle} editable={mode === 'document'} />
  )}
</PictureInPicture>`;

/**
 * A checklist you can actually tick from inside the window. It only makes sense in
 * document mode — the canvas fallback below is a read-only snapshot, which is the
 * honest thing a picture-in-picture video can offer once buttons stop working.
 */
export default function Checklist() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PipMode>('closed');
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [draft, setDraft] = useState('');

  const toggle = (id: string) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    setTasks((current) => [...current, { id: `t${Date.now()}`, text, done: false }]);
    setDraft('');
  };

  const remaining = tasks.filter((task) => !task.done).length;

  const render: CanvasRenderer<Task[]> = (ctx, info) => drawChecklist(ctx, info.data, info.width, info.height);

  return (
    <ExampleFrame
      title="Interactive checklist"
      tagline="Tick things off from inside the floating window. This is the one thing document picture-in-picture buys you that a captured video never can, so the canvas frame below says so out loud."
      badges={['document', 'canvas']}
      mode={mode}
      open={open}
      onToggle={() => setOpen((value) => !value)}
      code={CODE}
      aside={
        <>
          <span className="aside-label">The same list, in the page</span>
          <ul className="checklist-list checklist-list-inline">
            {tasks.map((task) => (
              <li key={task.id}>
                <label>
                  <input type="checkbox" checked={task.done} onChange={() => toggle(task.id)} />
                  <span className={task.done ? 'done' : undefined}>{task.text}</span>
                </label>
              </li>
            ))}
          </ul>
          <form
            className="checklist-add"
            onSubmit={(event) => {
              event.preventDefault();
              addTask();
            }}
          >
            <input
              type="text"
              aria-label="New task"
              placeholder="Add a task"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit">Add</button>
          </form>
          <p className="aside-hint">
            State lives in the page, so ticking a box here and ticking it in the window are the same
            action.
          </p>
        </>
      }
    >
      <PictureInPicture<Task[]>
        open={open}
        onOpenChange={setOpen}
        onModeChange={setMode}
        className="panel-shell checklist-shell"
        controlsClassName="pip-controls"
        documentWindow={{
          size: SIZE,
          title: 'Checklist',
          css: 'body { margin: 0 } .panel { height: 100vh; border: 0; border-radius: 0 }',
        }}
        canvas={{ size: SIZE, data: tasks, render, fps: 1 }}
        inline={{ positionStorageKey: 'demo.checklist.position' }}
        controls={
          <>
            <span className="pip-controls-label">Checklist is in picture-in-picture</span>
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </>
        }
      >
        {({ dragHandleProps, mode: liveMode }) => (
          <div className="panel">
            <div className="panel-header" {...dragHandleProps}>
              <span className="dot" />
              <strong>Checklist</strong>
              <span className="count">{remaining} left</span>
            </div>
            <ul className="checklist-list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <label>
                    <input type="checkbox" checked={task.done} onChange={() => toggle(task.id)} />
                    <span className={task.done ? 'done' : undefined}>{task.text}</span>
                  </label>
                </li>
              ))}
            </ul>
            {liveMode === 'document' && (
              <form
                className="checklist-add"
                onSubmit={(event) => {
                  event.preventDefault();
                  addTask();
                }}
              >
                <input
                  type="text"
                  aria-label="New task"
                  placeholder="Add a task"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="submit">Add</button>
              </form>
            )}
          </div>
        )}
      </PictureInPicture>
    </ExampleFrame>
  );
}

type Theme = ReturnType<typeof readCssVars<typeof PALETTE>>;

function drawChecklist(ctx: CanvasRenderingContext2D, tasks: Task[], width: number, height: number) {
  const theme: Theme = readCssVars(document.documentElement, PALETTE);
  const pad = 14;
  const headerH = 34;
  const rowH = 38;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, width, height);

  // The header states the limit, because in this mode the frame really is a
  // picture and the checkboxes below it do nothing.
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, width, headerH);

  const previousSpacing = ctx.letterSpacing;
  ctx.letterSpacing = '0.1em';
  ctx.font = `600 10px ${SANS}`;
  ctx.fillStyle = theme.paper;
  ctx.fillText('READ-ONLY IN CANVAS MODE', pad, headerH / 2 + 0.5);
  ctx.letterSpacing = previousSpacing;

  const remaining = tasks.filter((task) => !task.done).length;
  ctx.textAlign = 'right';
  ctx.letterSpacing = '0.08em';
  ctx.fillText(`${remaining} LEFT`, width - pad, headerH / 2 + 0.5);
  ctx.textAlign = 'left';
  ctx.letterSpacing = previousSpacing;

  tasks.forEach((task, index) => {
    const top = headerH + index * rowH;
    const centerY = top + rowH / 2;

    ctx.fillStyle = theme.rule;
    ctx.fillRect(0, top + rowH - 1, width, 1);

    // A square box, filled solid when done. No rounding anywhere on this page.
    ctx.strokeStyle = task.done ? theme.accent : theme.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 0.5, centerY - 7.5, 15, 15);
    if (task.done) {
      ctx.fillStyle = theme.accent;
      ctx.fillRect(pad + 3, centerY - 5, 10, 10);
    }

    ctx.font = `${task.done ? 400 : 500} 13px ${SANS}`;
    ctx.fillStyle = task.done ? theme.text3 : theme.text;
    ctx.fillText(task.text, pad + 26, centerY + 0.5);

    if (task.done) {
      const textWidth = ctx.measureText(task.text).width;
      ctx.strokeStyle = theme.text3;
      ctx.beginPath();
      ctx.moveTo(pad + 26, centerY + 0.5);
      ctx.lineTo(pad + 26 + textWidth, centerY + 0.5);
      ctx.stroke();
    }
  });
}
