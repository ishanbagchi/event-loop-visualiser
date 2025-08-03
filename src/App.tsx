import { Header } from './components/Header'
import { Footer } from './components/Footer'
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
			<Footer />
		</div>
	)
}

export default App
