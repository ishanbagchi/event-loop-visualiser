# JavaScript Event Loop Visualizer

An interactive, browser-based tool that helps developers understand how the JavaScript event loop works by visualizing code execution in real-time.

![Event Loop Visualizer Demo](https://via.placeholder.com/800x400/2563eb/ffffff?text=Event+Loop+Visualizer)

[![CI/CD Pipeline](https://github.com/ishanbagchi/event-loop-visualiser/actions/workflows/ci.yml/badge.svg)](https://github.com/ishanbagchi/event-loop-visualiser/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/package-json/v/ishanbagchi/event-loop-visualiser)](https://github.com/ishanbagchi/event-loop-visualiser)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## 🚀 Features

-   **Interactive Code Editor** - Built-in Monaco editor with syntax highlighting
-   **Real-time Visualization** - Watch the call stack, callback queue, and Web APIs in action
-   **Step-by-Step Execution** - Control execution flow with play, pause, step, and reset
-   **Promise & Async Support** - Visualize microtask queue and promise resolution
-   **Function Block Highlighting** - See entire function blocks execute, not just single lines
-   **Console Output** - Monitor console.log output with proper timing
-   **Sample Code Library** - Pre-built examples for common async patterns
-   **Responsive Design** - Works on desktop and mobile devices

## 🎯 What You'll Learn

-   How the JavaScript event loop processes synchronous and asynchronous code
-   The difference between the call stack, callback queue, and microtask queue
-   Promise execution order vs setTimeout timing
-   Web API interaction patterns
-   Event-driven programming concepts

## 🛠 Tech Stack

-   **Frontend Framework:** React 19 with TypeScript
-   **Build Tool:** Vite
-   **Code Editor:** Monaco Editor (VS Code's editor)
-   **State Management:** Zustand
-   **Styling:** Custom CSS with responsive design
-   **Code Simulation:** Custom JavaScript parser and execution simulator
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
2. **Write Code** - Use the Monaco editor to write JavaScript with setTimeout, Promise, etc.
3. **Execute** - Click Play to start visualization or Step to go through execution manually
4. **Observe** - Watch how functions move between Call Stack, Web APIs, and Callback Queue

### Sample Code Categories

-   **Basic Timers** - setTimeout and setInterval examples
-   **Promises** - Promise.resolve, Promise chains, async/await
-   **Mixed Scenarios** - Complex interactions between timers and promises
-   **Event Handling** - DOM events and callback patterns

### Execution Controls

-   **▶️ Play** - Auto-step through execution (1.5s intervals)
-   **⏸️ Pause** - Pause automatic execution
-   **⏭️ Step** - Execute one step at a time
-   **🔄 Reset** - Reset to initial state
-   **🔄 Restart** - Reload code and reset

### Visual Components

1. **Call Stack** - Shows currently executing functions
2. **Web APIs** - Displays timers, promises, and other browser APIs
3. **Callback Queue** - Shows callbacks waiting to be executed
4. **Console** - Displays console.log output with timestamps
5. **Code Editor** - Highlights currently executing lines/functions

## 🏗 Project Structure

```
src/
├── components/         # React components
│   ├── ui/             # Reusable UI components (Button, Badge)
│   ├── CallStack.tsx   # Call stack visualization
│   ├── CallbackQueue.tsx # Callback queue visualization
│   ├── WebAPIs.tsx     # Web APIs visualization
│   ├── CodeEditor.tsx  # Monaco editor wrapper
│   ├── Console.tsx     # Console output display
│   └── ...
├── store/              # Zustand state management
│   └── index.ts        # App state and actions
├── types/              # TypeScript type definitions
│   └── index.ts        # Shared types
├── utils/              # Utility functions
│   └── codeSimulator.ts # Code execution simulation engine
└── App.tsx             # Main application component
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

The app uses a custom JavaScript parser (`CodeExecutionSimulator`) that:

-   Parses JavaScript code into execution steps
-   Simulates call stack, callback queue, and Web API interactions
-   Tracks Promise lifecycle (resolve → microtask queue → execution)
-   Handles setTimeout timing and callback execution
-   Maintains state snapshots for each execution step

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

The app uses custom CSS with CSS variables for theming. Main styles are in:

-   `src/App.css` - Main application styles
-   Component-specific styles are embedded in each component

### Adding New Web API Types

1. Update `WebAPIItem` type in `src/types/index.ts`
2. Add handling in `CodeExecutionSimulator`
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

-   Complex nested async patterns may not be fully visualized
-   Very large code blocks might affect performance
-   Mobile experience could be improved for complex visualizations

Found a bug? Please [report it using our bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

## 📋 Roadmap

### Phase 2 Features (Upcoming)

-   **Microtask Queue Separation** - Distinct visualization for Promise microtasks
-   **Execution Speed Control** - Adjustable animation speed slider
-   **Code Import/Export** - Save and share code snippets
-   **Advanced Debugging** - Breakpoints and variable inspection
-   **More API Support** - Fetch, DOM events, MutationObserver
-   **Accessibility Improvements** - Better keyboard navigation and screen reader support

Want to suggest a feature? [Create a feature request](.github/ISSUE_TEMPLATE/feature_request.md)!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

-   [Philip Roberts](https://github.com/latentflip) for the original Loupe visualizer that inspired this project
-   [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the excellent code editor
-   [React](https://reactjs.org/) and [Vite](https://vitejs.dev/) teams for the amazing development tools

---

**Built with ❤️ for the JavaScript community**

If you find this tool helpful, please ⭐ star the repository and share it with others!
