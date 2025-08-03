import { CodeEditor } from './components/CodeEditor'
import { ExecutionControls } from './components/ExecutionControls'
import { CallStack } from './components/CallStack'
import { CallbackQueue } from './components/CallbackQueue'
import { WebAPIs } from './components/WebAPIs'
import { SampleSelector } from './components/SampleSelector'
import { ExplanationPanel } from './components/ExplanationPanel'
import { Console } from './components/Console'
import './App.css'

function App() {
	return (
		<div className="app">
			{/* Header */}
			<header className="header">
				<div className="header-content">
					<h1>JavaScript Event Loop Visualizer</h1>
					<p>
						Understand how the JavaScript event loop works by
						stepping through code execution
					</p>
				</div>
			</header>

			{/* Main Content */}
			<main className="main">
				<div className="main-grid">
					{/* Left Column - Code Editor and Controls */}
					<div className="left-column">
						<SampleSelector />
						<CodeEditor />
					</div>

					{/* Right Column - Visualization and Console */}
					<div className="right-column">
						<ExecutionControls />

						{/* Visualization Grid */}
						<div className="visualization-grid">
							<CallStack />
							<WebAPIs />
							<CallbackQueue />
							<Console />
						</div>
					</div>
				</div>

				{/* Explanation Panel - Full Width */}
				<ExplanationPanel />
			</main>

			{/* Footer */}
			<footer className="footer">
				<div className="footer-content">
					<p>
						Learn more about the JavaScript Event Loop:{' '}
						<a
							href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop"
							target="_blank"
							rel="noopener noreferrer"
						>
							MDN Documentation
						</a>
					</p>
				</div>
			</footer>
		</div>
	)
}

export default App
