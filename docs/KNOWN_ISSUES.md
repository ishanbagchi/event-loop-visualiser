# Known Issues / Action Checklist

Derived from [`CODE_REVIEW.md`](./CODE_REVIEW.md). Roughly ordered by priority (quick correctness fixes first, larger architectural work last).

## Quick correctness fixes

- [x] `setInterval` never fires: fixed — now schedules a bounded number of repeated firings (3) and keeps the Web API entry registered throughout, matching how a real repeating timer behaves. See `CodeExecutionSimulator.INTERVAL_REPEAT_COUNT` in `src/utils/codeSimulator.ts`.
- [x] `play()` can spawn multiple overlapping intervals if clicked twice — fixed with an early return when already running plus a tracked `playIntervalId` that's cleared on pause/reset/restart/code change (`src/store/index.ts`).
- [x] `reset()` emptied `steps: []` without recomputing from `code` — fixed: `reset()` now rewinds using the already-computed steps (fast, no re-simulation), while `restart()` still re-simulates from `code`. Updated `src/store/__tests__/index.test.ts` to match the corrected behavior.

## Cleanup / dead code

- [x] Removed the ~120-line dead fallback branch in `step()` (`src/store/index.ts`) — now just uses the state snapshot every step already carries.
- [x] De-duplicated the setTimeout-callback and Promise-callback execution blocks in `codeSimulator.ts` into shared `executeCallbackBody`/`executeTimeoutCallback`/`executeIntervalCallback`/`executePromiseCallback` helpers; also unified `findSetTimeoutEndLine`/`findPromiseEndLine` into one `findBlockEndLine`, and `identifySetTimeoutBlocks` into a keyword-parameterized `identifyTimerBlocks` (reused for both setTimeout and setInterval).
- [x] Removed `coverage/` from git tracking (`git rm -r --cached coverage`) — stays on disk (still gitignored), just untracked going forward.
- [x] Removed root-level debug/test scripts: `debug-function-parsing.js`, `test-actual-execution.js`, `test-multiline-setTimeout.js`, `test-timeout.js` — ad hoc scratch scripts superseded by the real Vitest suite.
- [x] Removed stray `image.png` at repo root; README now points at `assets/demo-screenshot.png` instead. Moved `requirements.md` into `docs/REQUIREMENTS.md`.

## Coding standards

- [x] Added Zustand selectors in every component (`Console`, `CallbackQueue`, `CallStack`, `WebAPIs` use single-field selectors; `CodeEditor`, `ExecutionControls`, `ExplanationPanel`, `SampleSelector` use `useShallow` for multi-field selections) to stop full-tree re-renders on every playback tick. Updated the three component test files that mocked `useAppStore()` with a plain `mockReturnValue` so they now emulate the selector-call form too.
- [x] Moved `findFunctionEndLine` out of `CodeEditor.tsx`'s component body to module scope (it only depended on its arguments, not component state/refs).
- [x] Added `.prettierrc.json` and `.editorconfig` to lock in formatting (tabs, quotes, trailing commas, line endings) across contributors.

## Architectural (larger effort)

- [x] `codeSimulator.ts` was regex/line-matching, not a real parser — **fixed**: replaced with a real parser (Acorn) + a small tree-walking interpreter in `src/utils/interpreter/` (`environment.ts` scopes/closures, `interpreter.ts` expression/statement evaluation + built-ins, `scheduler.ts` a real macrotask/microtask event loop, `promise.ts` a minimal Promise implementation). `codeSimulator.ts` is now a thin wrapper delegating to `Interpreter`. This directly fixed the `console.log(a + b)` → `undefined` bug (now evaluates to `35`), added real function arguments/return values/recursion, real `.then().then()`/`.catch()`/`.finally()` chaining, and real multi-arg `console.log`. Unsupported syntax now surfaces as a visible `error`-type step instead of silently doing nothing. See `/Users/ishan/.claude/plans/majestic-puzzling-brooks.md` for the full design.
- [x] `CodeEditor.tsx` now highlights blocks using `findBlockEndLine`, which parses with Acorn and walks the real AST node locations — no more separate line-scanning heuristic.
- [x] `async`/`await` — implemented via a generator-based execution model: every statement/expression evaluator is a generator, `await` yields the awaited value up to `invokeFunctionBody`, and `runAsyncFunction` drives the generator, suspending on `await` and resuming it as a microtask when the awaited value/promise settles. See `Gen<T>`, `AwaitExpression` handling, and `runAsyncFunction` in `interpreter.ts`.
- [x] Loops (`for`, `while`, `do...while`, `for...of`, `for...in`, labeled `break`/`continue`), classes (fields, static members/blocks, getters/setters, `super`), and destructuring (array/object patterns, defaults, rest, nested, in params/catch/for-loop targets) are all implemented in `interpreter.ts`. Covered by `src/utils/__tests__/codeSimulator.test.ts` and `src/utils/interpreter/__tests__/*`.
- [ ] Generator functions (`function*`/`yield`) and private class fields (`#field`) are still unsupported — they throw a visible `Unsupported syntax` error rather than executing incorrectly.
