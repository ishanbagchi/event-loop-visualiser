import { Header } from './components/Header'
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
			<Header />

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
					<div className="footer-links">
						<a
							href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop"
							target="_blank"
							rel="noopener noreferrer"
							className="footer-link"
						>
							📚 Event Loop Guide
						</a>
						<span className="footer-separator">•</span>
						<a
							href="https://github.com/ishanbagchi/event-loop-visualiser"
							target="_blank"
							rel="noopener noreferrer"
							className="footer-link"
						>
							⭐ Star on GitHub
						</a>
						<span className="footer-separator">•</span>
						<a
							href="https://javascript.info/event-loop"
							target="_blank"
							rel="noopener noreferrer"
							className="footer-link"
						>
							📖 JavaScript.info
						</a>
					</div>
					<div className="footer-credits">
						<span>
							Built with ❤️ to help developers understand
							JavaScript internals
						</span>
					</div>
				</div>
			</footer>
		</div>
	)
}

export default App
