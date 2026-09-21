# Product

## Register

brand

## Users

Working React developers who have just hit the picture-in-picture wall. They arrive
from a search result, an npm listing or a link in a thread, usually with a tab of
half-broken `documentPictureInPicture` code already open. They have somewhere between
thirty seconds and two minutes, and one question: does this actually work on the
platforms I ship to, or is it another weekend-project package that only covers Chrome
desktop?

Their context is a browser next to an editor, on a laptop. A meaningful minority open
the page a second time on an Android phone, because that is the only way to see the
canvas fallback behave for real.

The job to be done is a trust decision, not a purchase. They need to watch the thing
run, see the fallback admit what it cannot do, and conclude the author understood the
problem before they did.

## Product Purpose

The demo page is the credibility surface for `react-pip-anywhere`. The README carries
the API; the page carries the proof. Three live examples, running in whichever of the
three strategies the visitor's own browser supports, with the current strategy named
on screen.

Success is a visitor who opens picture-in-picture at least once, understands why their
browser got the strategy it got, and leaves believing the package is maintained by
someone rigorous. Failure is a page that looks like every other generated landing page,
because then the code is assumed to be generated too.

## Brand Personality

Engineered, blunt, unembarrassed. The voice of good technical documentation: it states
limits before benefits, uses exact numbers, and never sells. Three words: precise,
candid, physical.

The emotional goal is confidence by way of specificity. The page should feel printed
rather than deployed, closer to a well-set product manual than a marketing site. Where
other library pages perform enthusiasm, this one performs competence.

## Anti-references

- **Generated AI-SaaS landing pages.** Gradient meshes, glassmorphism, lime-on-black,
  a row of three identical rounded-icon feature cards, a hero metric band. This is the
  primary thing to avoid; the page's whole argument is that a human built this.
- **Editorial-magazine affectation.** Display serif italics, drop caps, tracked
  uppercase kickers above every section heading, broadsheet columns. The package is an
  engineering artifact, not a long read.
- **Corporate enterprise documentation.** Blue-and-white chrome, stock developer
  photography, a heavy docs sidebar, vendor badges.
- **Terminal cosplay.** Monospace as a costume for "technical". Mono is for code,
  identifiers and tabular figures only.

## Design Principles

1. **The examples are the argument.** Live, running, interactive components come
   before any prose about them. Nothing on the page describes a capability the
   visitor cannot immediately exercise.
2. **Name the limit out loud.** Every strategy states what it cannot do in the same
   breath as what it can. The canvas frame says it is read-only; the matrix has empty
   cells, not asterisks. Candour is the differentiator.
3. **Practice what you preach.** The picture-in-picture panels and the canvas frames
   use the same palette, type and geometry as the page, driven by the same CSS custom
   properties the README tells users to read with `readCssVars`. The demo is the
   feature working.
4. **Structure as voice.** A visible grid, hairline rules, numbered sections and
   tabular alignment carry the design. No decoration is added that does not also
   organise something.
5. **Real data, real state.** Live timers, real relative timestamps, real mode
   detection. No screenshots of a UI, no invented metrics.

## Accessibility & Inclusion

WCAG 2.2 AA. Body and label text meets 4.5:1 against its own surface in both themes;
the vermillion and ultramarine fields are only used as backgrounds behind text that
clears contrast, never as thin text on paper.

Specifics for this page:

- Colour is never the only channel. Strategy identity is carried by a number, a name
  and a position as well as a field colour; feed tags carry their word, not just a hue.
- Full keyboard operation, including the example switcher (a real tablist) and the
  draggable inline widget (which has a non-drag path to everything it does).
- `prefers-reduced-motion` removes the load stagger and all transitions; the page is
  fully legible with motion off.
- The theme toggle is a genuine user control, not a decorative switch: it is also how
  a visitor verifies that the canvas frame follows the page palette.
