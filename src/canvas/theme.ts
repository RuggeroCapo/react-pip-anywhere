/**
 * Reading colours back from CSS custom properties keeps a canvas frame on the same
 * palette as the DOM it mirrors, including light/dark switches, without a second
 * copy of the design tokens.
 */

export type CssVarMap = Record<string, readonly [name: string, fallback: string]>;

export type ResolvedVars<T extends CssVarMap> = { [K in keyof T]: string };

/**
 * Chrome substitutes `var()` in custom properties at computed-value time, but a
 * one-level indirection (`--border: var(--line)`) is cheap to resolve by hand and
 * keeps this safe on engines that hand the raw token sequence back.
 */
function readVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const raw = styles.getPropertyValue(name).trim();
  if (!raw) return fallback;
  const indirect = /^var\(\s*(--[\w-]+)/.exec(raw);
  if (!indirect) return raw;
  return styles.getPropertyValue(indirect[1] as string).trim() || fallback;
}

/**
 * ```ts
 * const theme = readCssVars(document.documentElement, {
 *   surface: ['--surface', '#111318'],
 *   text: ['--text', '#eef0f3'],
 * });
 * ctx.fillStyle = theme.surface;
 * ```
 */
export function readCssVars<T extends CssVarMap>(root: Element, map: T): ResolvedVars<T> {
  const styles = getComputedStyle(root);
  const result = {} as ResolvedVars<T>;
  for (const key of Object.keys(map) as (keyof T)[]) {
    const [name, fallback] = map[key] as readonly [string, string];
    result[key] = readVar(styles, name, fallback);
  }
  return result;
}
