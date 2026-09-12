import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { CodeEditor } from './components/CodeEditor'
import { ExecutionControls } from './components/ExecutionControls'
import { CallStack } from './components/CallStack'
import { CallbackQueue } from './components/CallbackQueue'
import { MicrotaskQueue } from './components/MicrotaskQueue'
import { WebAPIs } from './components/WebAPIs'
import { SampleSelector } from './components/SampleSelector'
import { ExplanationPanel } from './components/ExplanationPanel'
import { Console } from './components/Console'
import { EventLoopNotes } from './components/EventLoopNotes'
import './App.css'

function App() {
	return (
		<div className="app">
			<Header />

			<main className="main">
				<div className="main-grid">
					<div className="left-column">
						<SampleSelector />
						<ExecutionControls />
						<CodeEditor />
						<ExplanationPanel />
					</div>

					<div className="right-column">
						<div className="visualization-grid">
							<CallStack />
							<WebAPIs />
							<MicrotaskQueue />
							<CallbackQueue />
						</div>

						<Console />

						<EventLoopNotes />
					</div>
				</div>
			</main>

			<Footer />
		</div>
	)
}

export default App
