import { afterEach, expect, it } from 'vitest';
import { readCssVars } from '../../src/canvas/theme';

let root: HTMLElement | null = null;

afterEach(() => {
  root?.remove();
  root = null;
});

function makeRoot(properties: Record<string, string>): HTMLElement {
  root = document.createElement('div');
  Object.entries(properties).forEach(([name, value]) => root!.style.setProperty(name, value));
  document.body.append(root);
  return root;
}

it('reads custom properties off a real element', () => {
  const element = makeRoot({ '--surface': '#111318', '--text': '#eef0f3' });

  expect(
    readCssVars(element, {
      surface: ['--surface', '#000000'],
      text: ['--text', '#ffffff'],
    })
  ).toEqual({ surface: '#111318', text: '#eef0f3' });
});

it('falls back when a property is not defined', () => {
  const element = makeRoot({});
  expect(readCssVars(element, { missing: ['--nope', '#abcdef'] })).toEqual({
    missing: '#abcdef',
  });
});

it('resolves a one-level var() indirection', () => {
  // This is the `--border: var(--line)` shape real design systems use.
  const element = makeRoot({ '--line': 'rgba(15, 23, 42, 0.14)', '--border': 'var(--line)' });
  const { border } = readCssVars(element, { border: ['--border', '#fff'] });

  expect(border).toContain('rgba');
  expect(border).not.toContain('var(');
});

it('follows a theme switch without a second palette', () => {
  const element = makeRoot({ '--surface': '#111318' });
  expect(readCssVars(element, { surface: ['--surface', '#000'] }).surface).toBe('#111318');

  element.style.setProperty('--surface', '#ffffff');
  expect(readCssVars(element, { surface: ['--surface', '#000'] }).surface).toBe('#ffffff');
});
