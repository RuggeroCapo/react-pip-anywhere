# Design

Visual system for the `react-pip-anywhere` demo page. Companion to PRODUCT.md, which
holds the strategy. Source of truth for the tokens is `demo/src/styles.css`; this file
explains the intent behind them.

## Theme

**Light by default, dark as a real alternative.** Both are first-class, because the
theme toggle is itself a demonstration: flipping it repaints the canvas frame through
`readCssVars`, which is the package's answer to "how do I keep one palette".

The scene that settled it: a developer at their desk in daylight, page open beside an
editor, deciding in ninety seconds whether to trust this. A dark ground would have been
the category reflex for a developer library and would have read as one more terminal
costume. Ink on warm paper reads as a printed specification, which is the register the
package's own README already speaks in.

## Aesthetic lane

**Bold Swiss print manual.** Müller-Brockmann concert poster geometry applied to a
technical document: an oversized grotesk headline, a strict visible grid, hairline
rules, large flat colour fields, generous margins, numbered sections.

Deliberately not: editorial-magazine (no serifs, no italics, no drop caps), not
instrument-dark (mono is for code only), not enterprise docs (no sidebar chrome).

## Color

Authored in OKLCH. Three inks on paper, the way a two-colour press job works: black,
vermillion, ultramarine. Strategy is **full palette**, three named roles each carrying
one idea, with the colour appearing as solid fields rather than accents.

### Roles

| Role | Meaning | Light | Dark |
|---|---|---|---|
| `--paper` / `--bg` | The page ground | `oklch(0.968 0.009 85)` | `oklch(0.177 0.011 70)` |
| `--surface` | Panels, the PiP window, stage | `oklch(0.995 0.004 85)` | `oklch(0.222 0.011 70)` |
| `--surface-2` | Chalk fill, table stripes, inputs | `oklch(0.932 0.012 85)` | `oklch(0.268 0.012 70)` |
| `--text` | Ink | `oklch(0.196 0.014 70)` | `oklch(0.958 0.006 85)` |
| `--text-2` | Secondary ink, INFO tag | `oklch(0.442 0.013 70)` | `oklch(0.742 0.010 80)` |
| `--text-3` | Tertiary ink, rules, meta | `oklch(0.600 0.011 70)` | `oklch(0.570 0.010 80)` |
| `--accent` | Vermillion: the brand signal, the canvas strategy, ALERT | `oklch(0.577 0.206 32)` | `oklch(0.660 0.186 34)` |
| `--marine` | Ultramarine: the inline strategy, NEW, code fields | `oklch(0.438 0.187 266)` | `oklch(0.660 0.157 263)` |

Every neutral is tinted toward hue 70–85 (warm paper), never a pure grey and never
`#000` / `#fff`.

The three strategy fields are the palette's main event: **01 document** is ink,
**02 canvas** is vermillion, **03 inline** is ultramarine. No fourth colour exists, so
the fields cannot drift into decoration.

Colour is never the only channel: each strategy also carries its number, its name and
its position, and each feed tag carries its word.

## Typography

**Archivo** (Omnibus Type) carries everything. A grotesque drawn for high-performance
printing: tight apertures, a real heavy weight, a width axis. One family with committed
weight and size contrast, which is the Swiss shape.

**Spline Sans Mono** appears in exactly three places: the install command, the
`<pre>` code samples, and the renderer `<select>` whose values are identifiers. In
the drawn frames it is used for the ticking clock alone, which is the one figure
that has to hold a fixed width as it changes.

Nothing else is monospaced. Labels, badges, section numbers, table headings and
the mode readout are Archivo at weight 600, uppercase, tracked `0.1em`. Mono as a
label face is the "technical" costume the brand bans; the label voice has to come
from weight and tracking instead.

Explicitly rejected as training-data defaults: Inter (which the page previously used),
IBM Plex, Space Grotesk, DM Sans, Instrument Sans.

### Scale

Fluid `clamp()` on display sizes, ratio ≥ 1.33 between steps.

| Step | Size | Use |
|---|---|---|
| `--t-display` | `clamp(3.5rem, 12vw, 9.5rem)` | The masthead word stack, weight 800, tracking `-0.045em` |
| `--t-section` | `clamp(1.75rem, 4vw, 2.75rem)` | Section headings, weight 700 |
| `--t-lead` | `clamp(1.0625rem, 1.6vw, 1.375rem)` | The one-sentence pitch, weight 400 |
| `--t-body` | `0.9375rem` | Prose, capped at 68ch |
| `--t-small` | `0.8125rem` | Captions, taglines, mode notes |
| `--t-label` | `0.6875rem` | Labels, Archivo weight 600, tracking `0.1em`, uppercase |

Dark theme adds `0.06` to body line-height, because light type on ink reads lighter.

## Layout

A **12-column grid**, visible. `--gutter` is `clamp(1rem, 4vw, 3rem)`; the page keeps a
wide outer margin at large viewports rather than a centred content column with dead
rails. Maximum content width 1280px.

Rhythm comes from varying the section gap, not from uniform padding: the masthead is
tight, the live section breathes, the strategy fields are edge to edge.

Sections are numbered `01`–`04` and separated by a 1px ink rule at 15% alpha. Panels are
square: `border-radius: 0` throughout, except the PiP window shell which keeps 2px so it
does not fight the OS window frame.

**Not cards.** The three strategy fields are columns of one ruled block sharing a header
row, not floating boxes. The example switcher is a segmented tablist, not a card list.

## Components

- **Masthead**: meta strip (name · version · licence · install) over a three-line
  display stack, over the pitch sentence. Left-aligned, asymmetric.
- **Tablist**: numbered segments, the active one filled with ink and reversed out.
  `role="tablist"` with arrow-key roving focus.
- **Stage**: the live example sits on `--surface` inside a 1px ink frame with a ruled
  caption bar carrying the live mode name.
- **Strategy fields**: three full-bleed colour columns, each with an oversized number,
  the strategy name, the browsers it serves, and a plain sentence naming its limit.
- **Matrix**: a real `<table>` with mono tabular figures, a filled square for support
  and an empty cell for none.
- **Buttons**: square, 1px ink border, ink fill on the primary. No shadows.

## Motion

Restrained, as the lane demands. One page-load stagger: masthead lines and section
rules draw in on `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo), 420ms, 60ms apart.
Nothing else animates on scroll.

Interaction transitions are 120ms on colour and border only. No layout-property
animation, no bounce, no glass, no shadows used as elevation theatre.

`prefers-reduced-motion: reduce` removes all of it.

## Canvas frames

The drawn frames follow the same system, which is the point of the demo: square
corners, flat fields, hairline rules, Archivo for text, Spline Sans Mono for figures,
colours read from these same custom properties at paint time.
