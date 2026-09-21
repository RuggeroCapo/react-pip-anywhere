import { describe, expect, it } from 'vitest';
import { clampWithEllipsis, ellipsize, wrapText } from '../src/canvas/text';
import { fakeMeasuringContext } from './helpers';

// Every character is 10 units wide, so a 100-unit line holds exactly 10 of them.
const ctx = fakeMeasuringContext(10);

describe('ellipsize', () => {
  it('leaves text that fits alone', () => {
    expect(ellipsize(ctx, 'abcde', 100)).toBe('abcde');
  });

  it('cuts to fit including the ellipsis', () => {
    // 'abcdefghijkl' is 120 wide; the result must be at most 100 with the ellipsis.
    const result = ellipsize(ctx, 'abcdefghijkl', 100);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length * 10).toBeLessThanOrEqual(100);
  });
});

describe('clampWithEllipsis', () => {
  it('always appends an ellipsis, even when the text already fits', () => {
    expect(clampWithEllipsis(ctx, 'abc', 100)).toBe('abc…');
  });

  it('does not leave trailing whitespace before the ellipsis', () => {
    expect(clampWithEllipsis(ctx, 'ab cd ', 100)).toBe('ab cd…');
  });
});

describe('wrapText', () => {
  it('breaks on words within the line budget', () => {
    expect(wrapText(ctx, 'aaa bbb ccc', 70, 3)).toEqual(['aaa bbb', 'ccc']);
  });

  it('ellipsises the last line when there is more text than lines', () => {
    const lines = wrapText(ctx, 'aaa bbb ccc ddd eee', 70, 2);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('aaa bbb');
    expect(lines[1]?.endsWith('…')).toBe(true);
  });

  it('does not ellipsise when everything fit', () => {
    const lines = wrapText(ctx, 'aaa bbb', 70, 2);
    expect(lines.some((line) => line.includes('…'))).toBe(false);
  });

  it('breaks a single word that is wider than the line', () => {
    const lines = wrapText(ctx, 'supercalifragilistic', 100, 2);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.endsWith('…')).toBe(true);
    expect((lines[0] as string).length * 10).toBeLessThanOrEqual(100);
  });

  it('handles an over-long first word followed by more text', () => {
    const lines = wrapText(ctx, 'supercalifragilistic tail', 100, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('tail');
  });

  it('returns nothing for empty input or no line budget', () => {
    expect(wrapText(ctx, '', 100, 2)).toEqual([]);
    expect(wrapText(ctx, '   ', 100, 2)).toEqual([]);
    expect(wrapText(ctx, 'aaa', 100, 0)).toEqual([]);
  });
});
