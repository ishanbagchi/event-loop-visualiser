# Design system - "Runtime Gazette"

This app follows a dark newspaper/broadsheet aesthetic (serif headlines,
monospace small-caps labels, ink on near-black paper) originally drafted as
a standalone prototype (`Event Loop Visualizer.html`) and then ported into
the real component tree. **`src/index.css` is the source of truth for every
token below** - if a value here and the CSS ever disagree, the CSS wins and
this file is stale and should be corrected.

Read this before touching any component's markup or CSS, and update it in
the same PR whenever a token or pattern below changes.

## Tokens (`src/index.css`)

All color/spacing/radius/shadow/font values are CSS custom properties on
`:root`. Never hardcode a hex value or px spacing in a component's CSS -
reference the token so a palette change stays a one-file edit.

- **Surfaces**: `--color-bg` (`#141312`), `--color-surface`,
  `--color-surface-raised`, `--color-border` /`--color-border-strong`
  (translucent white, not gray, since the ground is warm near-black).
- **Text**: `--color-text` (`#f3f2f2`), `--color-text-muted`,
  `--color-text-faint`.
- **Semantic accents** - each event-loop concept keeps ONE identity color
  everywhere it appears (header rule, pane dot/rule, item chips, console
  "from" tag):
  - `--color-stack` (cyan `#62c5ee`) - Call Stack, Callback Queue (macrotasks)
  - `--color-timer` (yellow `#edbb00`) - Web APIs
  - `--color-promise` (magenta `#ff90b1`) - Microtask Queue
  - `--color-interval` (violet) - reserved for a future setInterval-specific
    distinction; not currently driving any pane
  - `--color-error` (red) - error states
  - Each has a matching `*-bg` translucent tint for chip/badge backgrounds.
- **Fonts**: `--font-serif` (`Source Serif 4`) for headings, body copy and
  the explanation text; `--font-mono` (`Source Code Pro`) for labels,
  kickers, code, and anything uppercase/tracked-out. Loaded via Google
  Fonts in `index.html` - don't add a third family.
- **Spacing**: `--space-1` (4px) through `--space-6` (32px), rem-based.
- **Radius**: intentionally tight (`--radius-sm` 2px / `md` 3px / `lg` 5px)
  - this reads as set type and printed rules, not soft app chrome. Don't
    reach for a bigger radius to make something feel "friendlier."

## Layout rules

- **Two-column shell** (`App.css` `.main-grid`): a fixed `2fr 3fr` split
  between the source/controls column and the live-state column. Grid
  tracks are declared as `minmax(0, 2fr) minmax(0, 3fr)`, **never** a bare
  `2fr 3fr` - a plain `fr` track's implicit minimum is its content's
  min-content size, so one long unwrapped line or a wide textarea will grow
  that column and silently shift the split. Pair this with `min-width: 0`
  on `.left-column`/`.right-column` and any grid item that might overflow.
- **Event-loop panes grid** (`.visualization-grid`): a fixed 2x2
  (`repeat(2, minmax(0, 1fr))`), not `auto-fit`. `auto-fit` reflows to
  3+1 or worse whenever there's marginally more room, which reads as
  clutter - the four panes should always pair up the same way.
- Never size a grid that lives inside a column (e.g. the panes grid inside
  `.right-column`) with a viewport-width `@media` query. The column is
  narrower than the viewport; a `min-width` breakpoint tuned to the full
  window will trigger far too early relative to the column's actual width
  and cram everything into one row. Use `auto-fit`/`auto-fill` with
  `minmax()`, or a fixed track count, so sizing follows the container.

### Fitting the viewport without a page scroll (>=1024px)

Above the two-column breakpoint, `.app` is locked to `height: 100vh;
overflow: hidden` and `.main` becomes the one scrollable fallback
(`overflow-y: auto`), rather than letting the document grow past the
viewport. Below 1024px the layout is left as a normal, naturally-scrolling
single column - that's expected on a phone and shouldn't be "fixed."

Within each column, everything keeps its natural size (`flex-shrink: 0`)
**except one panel per column that's allowed to flex and scroll
internally**: the code editor on the left, the console on the right. Both
use `flex: 1; min-height: <floor>px` instead of a viewport-relative fixed
height, so they shrink to fit whatever room is actually left after the
fixed-size controls/panes around them, rather than reserving a fixed
percentage of the viewport regardless of what else is on screen.

Any element whose text content is genuinely variable-length (the
explanation sentence is the one case so far) needs its own `max-height` +
`overflow-y: auto`, not just a `min-height`. A `flex-shrink: 0` sibling
still renders at its full natural size for whatever content it's given -
if that content is a 3-line sentence instead of the usual 1, the box grows
by exactly that much, and with no cap it invisibly grows the fixed-height
column right past the locked viewport, clipped by `.main`'s overflow with
no visual indication *why*. A `max-height` on that specific element caps
the damage to itself (it gets its own tiny internal scrollbar) instead of
silently overflowing the whole layout.

If you need to reclaim more vertical space later, prefer shrinking the
`min-height` floors on the code editor / console / pane-content (in that
order) over touching type sizes - they already have internal scrolling for
the overflow case, so a smaller floor just means the internal scrollbar
kicks in a little sooner, which is a much smaller cost than shrinking text
that's meant to be read.

## Component patterns

### Pane shell (`PaneShell.tsx`)

Call Stack, Web APIs, Microtask Queue and Callback Queue all render through
one shared `PaneShell` component - never hand-roll a pane's header/rule/note
markup again, or the four will drift apart from each other (this has
already happened once). A pane is:

1. A borderless strip - **no card**: no background fill, no border, no
   border-radius, no box-shadow. It's demarcated only by the rule below.
2. Header row: a small colored square dot + uppercase mono title (both in
   the pane's one accent color) + item count right-aligned.
3. A 2px `.pane-rule` in the accent color, or a muted
   `rgba(243, 242, 242, 0.35)` when the pane is empty.
4. An italic serif note describing what the pane shows.
5. The content area (`.pane-content`, `min-height: 132px` so panes don't
   jump size as items come and go).

### Item chips (`.stack-item` / `.api-item` / `.queue-item` /
`.microtask-item`)

One shared base rule (`App.css`) - if you add a new chip variant, extend
that shared selector list, don't write a parallel one-off rule (the
`.microtask-item` chip was accidentally left out of the shared rule once
and silently lost its padding/font/animation).

- Flat strip: tinted background + a 3px colored left border. No border-radius,
  no full border, no drop shadow.
- `display: flex; align-items: baseline` - the item name and its "Line N"
  detail sit on **one row**, not stacked. Two stacked lines per chip reads
  as cluttered; keep every chip to a single line unless content genuinely
  can't fit.
- Every chip within one pane shares that pane's single accent color -
  don't recolor individual chips by async sub-type (e.g. setTimeout vs
  setInterval). The pane is the unit of color, not the chip.

### Controls / buttons

- Primary action (Play) is a filled pill in `--color-brand`.
- Secondary actions (Step) are outlined.
- Tertiary actions (Back, Reset) are plain text, muted, brightening on
  hover (Reset hovers toward the promise/magenta color as a subtle "this
  discards progress" cue).
- Headings inside chrome (panel headers, kickers, the tick/status line) are
  always `--font-mono`, uppercase, letter-spaced (~0.16-0.2em). Body copy
  and anything meant to be *read* (the explanation line, header subhead,
  footnotes) is `--font-serif`, often italic.

### Explanation

Not a bordered panel. A small mono phase label (`Synchronous` / `Hand-off`
/ `Queued` / `Error`) followed by one large italic serif sentence that
replaces itself with a brief rise-in animation on every step.

### Source panel (`CodeEditor.tsx`)

Click-to-edit, not a separate edit button: clicking anywhere in the
read-only trace focuses a textarea in the same spot with the caret placed
exactly where the click landed (via `caretRangeFromPoint`/
`caretPositionFromPoint`, mapped back through the line's DOM to an
absolute index into the source - not hand-rolled font-metric math).
`Trace this ▸` / `Cancel` commit or discard the edit and return to the
read view.

The read view is syntax-highlighted by tokenizing with the same acorn
parser the interpreter itself runs the code through (`acorn.tokenizer`),
not a regex guess at JS syntax - it can't mis-highlight inside a string or
a comment. Token colors reuse the existing accent palette rather than
introducing new hues: `--color-brand` (keywords), `--color-interval`
(strings/templates/regex), `--color-timer` (numbers), `--color-promise`
(an identifier immediately followed by `(`, i.e. a call), `--color-text-
faint` italic (comments). Non-executing lines are dimmed with `opacity`,
not a flat overridden `color` - opacity dims a token's own color without
erasing it, so the highlighting still reads (just quieter) outside the
active line, whereas overriding `color` would flatten every line but the
current one to the same gray.

## When in doubt

Re-open `~/Downloads/Event Loop Visualizer.html` (the original prototype)
rather than guessing - it's the reference this whole system was reverse
engineered from. Extracting it: the file is a Claude Design canvas export:
the real HTML/CSS/JS lives inside a JSON-escaped string in a
`<script type="__bundler/template">` tag, not in the visible top-level
markup.
