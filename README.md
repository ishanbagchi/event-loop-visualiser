# JavaScript Event Loop Visualizer

An interactive, browser-based tool that helps developers understand how the JavaScript event loop works by visualizing code execution in real-time.

![Event Loop Visualizer Demo](assets/demo-screenshot.png)

[![CI/CD Pipeline](https://github.com/ishanbagchi/event-loop-visualiser/actions/workflows/ci.yml/badge.svg)](https://github.com/ishanbagchi/event-loop-visualiser/actions/workflows/ci.yml)
[![Deployment Status](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://event-loop-visualiser.ishanbagchi.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/package-json/v/ishanbagchi/event-loop-visualiser)](https://github.com/ishanbagchi/event-loop-visualiser)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## 🚀 Features

-   **Real JavaScript Interpreter** - Code is parsed with [Acorn](https://github.com/acornjs/acorn) and executed by a small tree-walking interpreter (`src/utils/interpreter/`), not pattern-matched with regex, so execution order and values are actually correct
-   **Click-to-Edit Source Panel** - Click anywhere in the syntax-highlighted trace to edit in place, then re-run ("Trace this")
-   **Real-time Visualization** - Watch the call stack, Web APIs, microtask queue, and callback queue update live
-   **Step-by-Step Execution** - Control execution flow with play, pause, step, and reset
-   **Promise & Async Support** - Real `.then()`/`.catch()`/`.finally()` chaining with a dedicated microtask queue pane, separate from the macrotask callback queue
-   **Function Calls, Args & Recursion** - Real function arguments, return values, closures, and recursive calls
-   **Console Output** - Monitor `console.log` output (multi-argument, real value formatting) with proper timing
-   **Sample Code Library** - Pre-built examples for common async patterns
-   **Responsive Design** - Works on desktop and mobile devices

## 🎯 What You'll Learn

-   How the JavaScript event loop processes synchronous and asynchronous code
-   The difference between the call stack, Web APIs, microtask queue, and callback (macrotask) queue
-   Promise execution order vs setTimeout timing
-   Web API interaction patterns
-   Event-driven programming concepts

### Not yet supported

The interpreter is a real (but intentionally small) implementation, not a full JS engine. `async`/`await`, loops (`for`/`while`), classes, and destructuring aren't implemented yet — code using them surfaces a visible error step instead of silently doing the wrong thing. See [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) for the current list.

## 🛠 Tech Stack

-   **Frontend Framework:** React 19 with TypeScript
-   **Build Tool:** Vite
-   **State Management:** Zustand
-   **Styling:** Custom CSS with CSS custom-property design tokens (see [`docs/DESIGN.md`](docs/DESIGN.md))
-   **Code Simulation:** [Acorn](https://github.com/acornjs/acorn) parser + a custom tree-walking interpreter (`src/utils/interpreter/`) with its own scheduler and Promise implementation
-   **Testing:** Vitest + React Testing Library
-   **CI/CD:** GitHub Actions with automated testing and security checks

## 📦 Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/ishanbagchi/event-loop-visualiser.git
    cd event-loop-visualiser
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Start the development server**

    ```bash
    npm run dev
    ```

4. **Open your browser**
    ```
    http://localhost:5173
    ```

## 🎮 How to Use

### Basic Usage

1. **Select a Sample** - Choose from pre-built examples or write your own code
2. **Write Code** - Click into the source panel to edit JavaScript with setTimeout, Promise, etc., then click "Trace this ▸" to re-run
3. **Execute** - Click Play to start visualization or Step to go through execution manually
4. **Observe** - Watch how functions move between the Call Stack, Web APIs, Microtask Queue, and Callback Queue

### Sample Code Categories

-   **Timers** - `setTimeout` and nested-timeout examples
-   **Promises** - Promise resolution and `.then()` chains
-   **Basic** - Mixed timer/promise scenarios and nested function calls

### Execution Controls

-   **▶️ Play** - Auto-step through execution (1.5s intervals)
-   **⏸️ Pause** - Pause automatic execution
-   **⏭️ Step** - Execute one step at a time
-   **🔄 Reset** - Reset to initial state
-   **🔄 Restart** - Reload code and reset

### Visual Components

1. **Call Stack** - Shows currently executing functions
2. **Web APIs** - Displays timers and other browser APIs
3. **Microtask Queue** - Shows pending Promise callbacks (`.then`/`.catch`/`.finally`), drained before the next macrotask
4. **Callback Queue** - Shows macrotask callbacks (e.g. `setTimeout`) waiting to be executed
5. **Console** - Displays console.log output with timestamps
6. **Code Editor** - Click-to-edit source panel, syntax-highlighted and highlighting the currently executing line/function
7. **Explanation Panel** - One-sentence, phase-labeled explanation of what just happened, updated every step

## 🏗 Project Structure

```
src/
├── components/          # React components
│   ├── ui/              # Reusable UI components (Button, Badge)
│   ├── PaneShell.tsx    # Shared shell (header/rule/note) for the four event-loop panes
│   ├── CallStack.tsx    # Call stack visualization
│   ├── WebAPIs.tsx      # Web APIs visualization
│   ├── MicrotaskQueue.tsx # Microtask (Promise) queue visualization
│   ├── CallbackQueue.tsx  # Callback (macrotask) queue visualization
│   ├── CodeEditor.tsx   # Click-to-edit source panel with acorn-based syntax highlighting
│   ├── Console.tsx      # Console output display
│   ├── ExplanationPanel.tsx # Per-step explanation text
│   ├── EventLoopNotes.tsx   # Static explainer notes on the event loop
│   └── ...
├── store/               # Zustand state management
│   └── index.ts         # App state and actions
├── types/                # TypeScript type definitions
│   └── index.ts          # Shared types
├── utils/
│   ├── codeSimulator.ts  # Thin wrapper delegating to the interpreter
│   └── interpreter/      # Real parser + tree-walking interpreter
│       ├── interpreter.ts  # Statement/expression evaluation, built-ins
│       ├── environment.ts  # Scopes, closures
│       ├── scheduler.ts    # Macrotask/microtask event loop
│       ├── promise.ts      # Minimal Promise implementation
│       ├── values.ts       # Runtime value helpers
│       └── trace.ts        # Execution step/trace recording
└── App.tsx               # Main application component
```

## 🔧 Development

### Available Scripts

-   `npm run dev` - Start development server
-   `npm run build` - Build for production
-   `npm run preview` - Preview production build
-   `npm run lint` - Run ESLint
-   `npm run type-check` - Run TypeScript compiler check
-   `npm run test` - Run tests with Vitest
-   `npm run test:watch` - Run tests in watch mode
-   `npm run coverage` - Generate test coverage report

### Code Simulation Engine

The app parses JavaScript with [Acorn](https://github.com/acornjs/acorn) into a real AST, then walks it with a small tree-walking interpreter (`src/utils/interpreter/Interpreter`) that:

-   Evaluates statements/expressions with real scopes, closures, and recursion (`environment.ts`)
-   Runs a real macrotask/microtask event loop (`scheduler.ts`) and a minimal Promise implementation (`promise.ts`)
-   Records an `ExecutionStep[]` trace (`trace.ts`) — call stack, Web APIs, microtask queue, callback queue, and console output snapshotted at every step
-   Surfaces unsupported syntax (loops, classes, destructuring, `async`/`await`) as a visible error step instead of failing silently
-   `codeSimulator.ts` is a thin wrapper around `Interpreter` kept for backwards-compatible call sites

### State Management

Built with Zustand for lightweight, predictable state management:

```typescript
interface AppStore {
	// Execution state
	callStack: CallStackItem[]
	callbackQueue: CallbackQueueItem[]
	webAPIs: WebAPIItem[]

	// Control state
	currentStep: number
	isRunning: boolean
	isPaused: boolean

	// Actions
	play: () => void
	pause: () => void
	step: () => void
	reset: () => void
}
```

## 🎨 Customization

### Adding New Sample Code

Edit `src/store/index.ts` and add to the `codeSamples` array:

```typescript
{
  id: 'your-sample-id',
  title: 'Your Sample Title',
  description: 'Description of what this demonstrates',
  category: 'category-name',
  code: `
console.log('Your sample code here');
setTimeout(() => {
  console.log('Async callback');
}, 1000);
  `
}
```

### Styling

The app follows the "Runtime Gazette" design system — see [`docs/DESIGN.md`](docs/DESIGN.md) before touching any component's markup or CSS. Key points:

-   `src/index.css` is the source of truth for every design token (color, spacing, radius, font) — never hardcode a value in component CSS, reference the token
-   `src/App.css` holds layout and shared component-pattern styles (panes, chips, etc.)
-   Call Stack, Web APIs, Microtask Queue, and Callback Queue all render through the shared `PaneShell` component — don't hand-roll a pane's header/rule/note markup

### Adding New Web API Types

1. Update `WebAPIItem` type in `src/types/index.ts`
2. Add handling in `src/utils/interpreter/interpreter.ts`
3. Update `WebAPIs.tsx` component for visualization

## 🧪 Testing

The project includes comprehensive testing setup:

```bash
npm run test        # Run tests
npm run test:watch  # Run tests in watch mode
npm run coverage    # Generate coverage report
```

### Automated Testing

Our CI/CD pipeline automatically runs:

-   ✅ **Code linting** with ESLint
-   ✅ **Type checking** with TypeScript
-   ✅ **Unit tests** with Vitest
-   ✅ **Build verification**
-   ✅ **Security auditing** for dependencies
-   ✅ **Coverage reporting**

All pull requests are automatically tested before they can be merged.

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect it's a Vite project
3. Deploy with default settings

### Deploy to Netlify

1. Build the project: `npm run build`
2. Deploy the `dist/` folder to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information.

⚠️ **Branch Protection**: The `main` branch is protected. All changes must go through pull requests with required status checks and code review. See [Branch Protection Rules](.github/BRANCH_PROTECTION.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes following our [coding standards](CONTRIBUTING.md#code-style-guidelines)
4. Add tests for new functionality
5. Commit your changes: `git commit -m "feat: add new feature"`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request using our [PR template](.github/pull_request_template.md)
8. Wait for automated checks and code review

### Development Guidelines

-   Follow TypeScript best practices
-   Add tests for new functionality (we use Vitest + React Testing Library)
-   Update documentation for new features
-   Ensure responsive design for new components
-   Test across different browsers
-   All PRs are automatically tested with our CI/CD pipeline

### Reporting Issues

Please use our issue templates:

-   [🐛 Bug Report](.github/ISSUE_TEMPLATE/bug_report.md)
-   [✨ Feature Request](.github/ISSUE_TEMPLATE/feature_request.md)
-   [📚 Documentation Issue](.github/ISSUE_TEMPLATE/documentation.md)

## 📚 Educational Resources

Learn more about the JavaScript Event Loop:

-   [MDN: Concurrency model and Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop)
-   [Loupe by Philip Roberts](http://latentflip.com/loupe/) - Original inspiration
-   [JavaScript Event Loop Explained](https://dev.to/lydiahallie/javascript-visualized-event-loop-3dif)
-   [Understanding the Event Loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)

## 🐛 Known Issues

-   `async`/`await`, loops (`for`/`while`), classes, and destructuring aren't implemented yet — using them surfaces a visible error step rather than silently doing the wrong thing
-   `CodeEditor.tsx`'s line-highlighting still uses its own simple line-scanning heuristic rather than real AST node ranges from the interpreter's parse — cosmetic only, doesn't affect execution correctness
-   Mobile experience could be improved for complex visualizations

See [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) for the full, prioritized list. Found a bug? Please [report it using our bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

## 📋 Roadmap

### Upcoming

-   **`async`/`await` Support** - Would need a generator-based execution model so `await` can suspend/resume through the scheduler
-   **Loops, Classes & Destructuring** - Straightforward additions to the interpreter's `execute`/`evaluate` switches
-   **Execution Speed Control** - Adjustable animation speed slider
-   **Code Import/Export** - Save and share code snippets
-   **Advanced Debugging** - Breakpoints and variable inspection
-   **More API Support** - Fetch, DOM events, MutationObserver
-   **Accessibility Improvements** - Better keyboard navigation and screen reader support

Want to suggest a feature? [Create a feature request](.github/ISSUE_TEMPLATE/feature_request.md)!

## 📖 Additional Documentation

-   [`docs/DESIGN.md`](docs/DESIGN.md) - The "Runtime Gazette" design system: tokens, layout rules, component patterns
-   [`docs/CODE_REVIEW.md`](docs/CODE_REVIEW.md) - Full architectural/code-quality review this rewrite was based on
-   [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) - Prioritized, actionable checklist derived from the code review

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

-   [Philip Roberts](https://github.com/latentflip) for the original Loupe visualizer that inspired this project
-   [Acorn](https://github.com/acornjs/acorn) for the lightweight JavaScript parser powering the interpreter
-   [React](https://reactjs.org/) and [Vite](https://vitejs.dev/) teams for the amazing development tools

---

**Built with ❤️ for the JavaScript community**

If you find this tool helpful, please ⭐ star the repository and share it with others!
