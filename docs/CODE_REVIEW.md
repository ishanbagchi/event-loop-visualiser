# Code Review — Event Loop Visualiser

Date: 2026-09-11

Scope: full-project review of logic, architecture, coding standards, and repo hygiene. Covers `src/utils/codeSimulator.ts`, `src/store/index.ts`, `src/components/*`, and repository housekeeping.

## 1. Core architectural problem: it's not a JS interpreter, it's regex/line-matching

`src/utils/codeSimulator.ts` (1091 lines) doesn't parse or execute JavaScript — it pattern-matches strings line by line (`trimmedLine.includes('setTimeout')`, brace-counting for block ends, regex to pull out `console.log` arguments). For a tool whose entire purpose is to *teach the event loop accurately*, this is the biggest risk: it will silently visualize the wrong thing for any code that isn't shaped exactly like the bundled samples.

Concrete consequences:

- **`setInterval` is broken**: `simulateSetInterval` (codeSimulator.ts:845-891) registers the timer in `webAPIs` but never pushes anything to `pendingCallbacks`. The interval callback is never scheduled, never fires, and the Web API entry never gets removed — it just sits there forever. The feature is visually present (`WebAPIs.tsx` renders a `setInterval` type) but functionally dead.
- **Only zero-argument function calls are supported**: `isFunctionCall` requires `/^\s*(\w+)\s*\(\s*\)\s*;?\s*$/` (codeSimulator.ts:952). Anything like `foo(1)`, `foo(bar)`, arrow functions, IIFEs, method calls (`obj.method()`), or class code is silently ignored — not flagged, just skipped, which will confuse a learner into thinking that code has no effect.
- **`console.log` only extracts single string literals**: `/console\.log\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/` (codeSimulator.ts:799, 523). `console.log(x)`, `console.log('a', b)`, template literals with interpolation, or numbers all fall through to `'undefined'`.
- **Only one `.then()` is supported** — no `.then().then()` chains, no `.catch()`/`.finally()`, and `async`/`await` isn't handled at all despite being the most common way people now write async code and arguably the #1 thing people find confusing about the event loop.
- **`setTimeout` delay extraction is three stacked regex heuristics with a 5-line lookahead** (codeSimulator.ts:95-129) — fragile against any formatting variation (delay on the same line as an unrelated `}`, delay expressed as a variable/expression, nested setTimeouts).
- **Two independent, disagreeing parsers**: `CodeEditor.tsx` has its own from-scratch brace/paren/string-aware block-end finder (`findFunctionEndLine`, lines 28-111) that is completely separate from the simulator's `findSetTimeoutEndLine`/`findPromiseEndLine`/`findFunctionEndLine`. They will diverge on edge cases (e.g. a `)` inside a string), so the editor's highlighted range and the simulator's actual step boundaries can disagree.

**Recommendation**: if this project is meant to be more than a fixed demo gallery, swap the regex approach for a real parser (e.g. Acorn/Babel) and drive the visualization off an AST + a tiny interpreter. That's a substantial rewrite, so at minimum, gate free-form editing behind a warning ("only patterns from the sample gallery are guaranteed to simulate correctly") since right now the editor invites input the engine can't actually handle.

## 2. Concrete bugs (not just architecture)

- **`play()` can spawn multiple intervals** (`store/index.ts:174-196`). Nothing guards against calling `play()` again while already running — there's no stored interval ID to clear, and no check like `if (state.isRunning) return`. Two rapid clicks on "Play" doubles playback speed and leaks timers.
- **`reset()` empties `steps: []`** (`store/index.ts:344-347`) but doesn't recompute them from `code`. After reset, `step()`/`play()` are no-ops until the user calls `restart()` or reloads a sample — likely not what "Reset" should mean to a user, since `restart()` already exists and does the "correct" reset (recompute steps, keep code).
- **~120 lines of dead fallback code** in `store/index.ts` `step()` (lines 216-332): this manual state-reconstruction branch only runs `if (!currentStepData.state)`, but `codeSimulator.ts` attaches `state` to literally every step it pushes. This branch is unreachable in practice, yet it's maintained and duplicates logic that already lives correctly in the simulator — pure dead weight and a maintenance trap (a future change to the simulator's step shape could silently make this stale branch start firing with wrong logic).
- **Massive duplication inside `simulateCode` itself**: the setTimeout-callback-execution block (codeSimulator.ts:456-637) and the Promise-callback-execution block (codeSimulator.ts:264-454) are ~180 lines each of near-identical step-pushing logic (console.log extraction, call stack push/pop, step description) that differ only in a few strings/types. This should be one parameterized helper.

## 3. State management / React coding standards

- **No selectors anywhere** — every component does `const {...} = useAppStore()` (Console, CallbackQueue, CallStack, CodeEditor, ExecutionControls, ExplanationPanel, SampleSelector, WebAPIs all confirmed). Zustand re-renders any component that reads *any* part of the store on *any* `set()` call. Since `step()`/`play()` update `currentStep` every 1.5s, every component — including the Monaco editor — re-renders on every tick even though most of their inputs haven't changed. Should use per-slice selectors, e.g. `useAppStore(s => s.callStack)`.
- **`findFunctionEndLine` in `CodeEditor.tsx`** is redefined on every render (not `useCallback`/module-level), and is called inside a `useEffect` — harmless functionally but avoidable churn and inconsistent with the rest of the file's use of refs to avoid re-creation.

## 4. Repo hygiene / coding standards

- **`coverage/` (32 files) is committed to git** despite being listed in `.gitignore` — it was likely `git add`ed before the ignore rule existed. Should be removed with `git rm -r --cached coverage` and a commit; currently bloats the repo with generated HTML on every commit.
- **Four loose debug/test scripts committed at repo root**: `debug-function-parsing.js`, `test-actual-execution.js`, `test-multiline-setTimeout.js`, `test-timeout.js`. These aren't part of the `src/**/__tests__` suite (which uses Vitest properly) — they look like ad hoc scratch scripts left over from development. Either move them into the real test suite or delete them.
- **`image.png` at repo root** — unclear purpose, not referenced from `src/` or `public/` as far as the file listing shows; likely a stray screenshot that should live in `assets/` (where `demo-screenshot.png` already is) or be removed.
- **`.env` is untracked (good)**, but it only contains non-secret `VITE_APP_*` display strings, so there's no actual secret-handling to worry about currently — flagging only because if real secrets are ever added, `VITE_`-prefixed env vars get bundled into client JS and exposed publicly by Vite's design, which is easy to forget.
- **No `.prettierrc` or `.editorconfig`** — indentation in the codebase is tabs; with no enforced formatter config, this depends purely on editor settings staying consistent across contributors.
- **ESLint config is minimal** (`eslint.config.js`): recommended JS/TS rules + react-hooks + react-refresh, but no `no-unused-vars` strictness beyond default, no import-order, and no test-specific config for `src/__tests__` globals.

## 5. What's actually solid

- Real Vitest test suite with `__tests__` colocated per module (`codeSimulator`, `store`, several components) — decent structure, and CI workflows exist (`.github/workflows/ci.yml`, `pr-checks.yml`) with branch protection docs.
- No `any` usage found in `src/`, and no leftover `TODO`/`FIXME` markers.
- `types/index.ts` gives a single shared source of truth for `ExecutionStep`/`CallStackItem`/etc., consistently imported everywhere.
- Component decomposition (`CallStack`, `CallbackQueue`, `WebAPIs`, `Console`, `ExecutionControls`, etc.) is clean and single-purpose, which is what makes the store-selector fix in §3 straightforward to apply.

See [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) for a prioritized, actionable checklist derived from this review.
