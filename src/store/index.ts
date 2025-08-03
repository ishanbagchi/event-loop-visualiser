import { create } from 'zustand'
import type { ExecutionState, CodeSample } from '../types'
import { CodeExecutionSimulator } from '../utils/codeSimulator'

interface AppStore extends ExecutionState {
	code: string
	samples: CodeSample[]
	currentSample?: CodeSample

	// Actions
	setCode: (code: string) => void
	loadSample: (sample: CodeSample) => void
	play: () => void
	pause: () => void
	step: () => void
	reset: () => void
	restart: () => void
	addConsoleLog: (
		message: string,
		type?: 'info' | 'warn' | 'error' | 'success',
	) => void
}

const initialState: ExecutionState = {
	callStack: [],
	callbackQueue: [],
	webAPIs: [],
	currentStep: 0,
	steps: [],
	isRunning: false,
	isPaused: false,
	currentLine: undefined,
	consoleLogs: [],
}

const codeSamples: CodeSample[] = [
	{
		id: 'basic-timeout',
		title: 'Basic setTimeout',
		description: 'Simple setTimeout example showing callback queue',
		category: 'timers',
		code: `console.log('Start');

setTimeout(() => {
  console.log('Timeout callback');
}, 1000);

console.log('End');`,
	},
	{
		id: 'nested-timeout',
		title: 'Nested setTimeout',
		description: 'Multiple setTimeout calls with different delays',
		category: 'timers',
		code: `console.log('First');

setTimeout(() => {
  console.log('First timeout');
  setTimeout(() => {
    console.log('Nested timeout');
  }, 500);
}, 1000);

setTimeout(() => {
  console.log('Second timeout');
}, 2000);

console.log('Last');`,
	},
	{
		id: 'promise-basic',
		title: 'Basic Promise',
		description: 'Simple Promise example',
		category: 'promises',
		code: `console.log('Start');

Promise.resolve('Promise result')
  .then(result => {
    console.log(result);
  });

console.log('End');`,
	},
	{
		id: 'mixed-async',
		title: 'Mixed Async Operations',
		description: 'Combination of setTimeout and Promise',
		category: 'basic',
		code: `console.log('Start');

setTimeout(() => {
  console.log('Timeout');
}, 0);

Promise.resolve().then(() => {
  console.log('Promise');
});

console.log('End');`,
	},
	{
		id: 'nested-functions',
		title: 'Nested Function Calls',
		description: 'Functions calling other functions with console.log',
		category: 'basic',
		code: `function third() {
  console.log("3")
}

function second() { 
  console.log("2 before")
  third() 
  console.log("2 after")
}

function first() { 
  console.log("1 before")
  second() 
  console.log("1 after")
}

first();`,
	},
]

export const useAppStore = create<AppStore>((set, get) => {
	// Initialize with the first sample
	const simulator = new CodeExecutionSimulator()
	const initialSteps = simulator.simulateCode(codeSamples[0].code)

	return {
		...initialState,
		code: codeSamples[0].code,
		samples: codeSamples,
		currentSample: codeSamples[0],
		steps: initialSteps,

		setCode: (code: string) => {
			// Re-analyze code when it changes
			const simulator = new CodeExecutionSimulator()
			const steps = simulator.simulateCode(code)
			set({
				code,
				steps,
				currentStep: 0,
				callStack: [],
				callbackQueue: [],
				webAPIs: [],
				isRunning: false,
				isPaused: false,
				currentLine: undefined,
				consoleLogs: [], // Reset console logs
			})
		},

		loadSample: (sample: CodeSample) => {
			const simulator = new CodeExecutionSimulator()
			const steps = simulator.simulateCode(sample.code)
			set({
				code: sample.code,
				currentSample: sample,
				steps,
				currentStep: 0,
				callStack: [],
				callbackQueue: [],
				webAPIs: [],
				isRunning: false,
				isPaused: false,
				currentLine: undefined,
				consoleLogs: [], // Reset console logs
			})
		},

		play: () => {
			const state = get()
			if (state.currentStep >= state.steps.length) return

			set({ isRunning: true, isPaused: false })

			// Simulate stepping through code automatically
			const interval = setInterval(() => {
				const currentState = get()
				if (!currentState.isRunning || currentState.isPaused) {
					clearInterval(interval)
					return
				}

				if (currentState.currentStep >= currentState.steps.length) {
					clearInterval(interval)
					set({ isRunning: false })
					return
				}

				get().step()
			}, 1500) // Slower for better visualization
		},

		pause: () => set({ isPaused: true, isRunning: false }),

		step: () => {
			const state = get()
			if (state.currentStep >= state.steps.length) return

			const nextStep = state.currentStep + 1
			const currentStepData = state.steps[state.currentStep]

			// Use state snapshots from the execution step if available
			if (currentStepData.state) {
				set({
					callStack: currentStepData.state.callStack,
					callbackQueue: currentStepData.state.callbackQueue,
					webAPIs: currentStepData.state.webAPIs,
					currentStep: nextStep,
					currentLine: currentStepData.lineNumber,
				})
			} else {
				// Fallback to manual state management for steps without state snapshots
				let newCallStack = [...state.callStack]
				let newCallbackQueue = [...state.callbackQueue]
				let newWebAPIs = [...state.webAPIs]

				if (currentStepData.type === 'function-call') {
					// Add function to call stack (simplified)
					if (currentStepData.description.includes('console.log')) {
						newCallStack = [
							...newCallStack,
							{
								id: `call-${Date.now()}`,
								name: 'console.log',
								lineNumber: currentStepData.lineNumber,
							},
						]
					} else if (
						currentStepData.description.includes(
							'setTimeout() called',
						)
					) {
						// setTimeout is being called - add to call stack temporarily
						newCallStack = [
							...newCallStack,
							{
								id: `call-${Date.now()}`,
								name: 'setTimeout',
								lineNumber: currentStepData.lineNumber,
							},
						]
					} else if (
						currentStepData.description.includes(
							'Event loop moved setTimeout callback',
						)
					) {
						// When event loop moves callback to call stack
						newCallStack = [
							...newCallStack,
							{
								id: `call-${Date.now()}`,
								name: 'setTimeout callback',
								lineNumber: currentStepData.lineNumber,
							},
						]
						// Remove from callback queue when callback starts executing
						newCallbackQueue = newCallbackQueue.filter(
							(_, index) => index !== 0,
						)
					}
				} else if (currentStepData.type === 'function-return') {
					// Remove function from call stack
					newCallStack = newCallStack.slice(0, -1)
				} else if (currentStepData.type === 'web-api') {
					if (
						currentStepData.description.includes('setTimeout') ||
						currentStepData.description.includes('Timer registered')
					) {
						const match =
							currentStepData.description.match(/(\d+)ms/)
						const delay = match ? parseInt(match[1]) : 0
						newWebAPIs = [
							...newWebAPIs,
							{
								id: `api-${Date.now()}`,
								name: `setTimeout(${delay}ms)`,
								type: 'setTimeout',
								timeRemaining: delay,
								lineNumber: currentStepData.lineNumber,
							},
						]
					}
				} else if (currentStepData.type === 'callback-queue') {
					if (
						currentStepData.description.includes(
							'Timer completed',
						) ||
						currentStepData.description.includes(
							'setTimeout callback',
						)
					) {
						newCallbackQueue = [
							...newCallbackQueue,
							{
								id: `cb-${Date.now()}`,
								name: 'setTimeout callback',
								type: 'timeout',
								lineNumber: currentStepData.lineNumber,
							},
						]
						// Remove from Web APIs when timer completes
						newWebAPIs = newWebAPIs.filter(
							(api) => !api.name.includes('setTimeout'),
						)
					} else if (
						currentStepData.description.includes('Promise.then')
					) {
						newCallbackQueue = [
							{
								id: `cb-${Date.now()}`,
								name: 'Promise.then callback',
								type: 'other',
								lineNumber: currentStepData.lineNumber,
							},
							...newCallbackQueue,
						]
					}
				}

				set({
					currentStep: nextStep,
					currentLine: currentStepData.lineNumber,
					callStack: newCallStack,
					callbackQueue: newCallbackQueue,
					webAPIs: newWebAPIs,
				})
			}

			// Add console logs from this step
			if (currentStepData.consoleLogs) {
				currentStepData.consoleLogs.forEach((log) => {
					// Map 'log' type to 'info' for the store
					const logType = log.type === 'log' ? 'info' : log.type
					get().addConsoleLog(log.message, logType)
				})
			}
		},

		reset: () => {
			const code = get().code
			set({ ...initialState, code, steps: [], consoleLogs: [] })
		},

		restart: () => {
			const state = get()
			const simulator = new CodeExecutionSimulator()
			const steps = simulator.simulateCode(state.code)
			set({
				...initialState,
				code: state.code,
				steps,
				currentSample: state.currentSample,
				consoleLogs: [],
			})
		},

		addConsoleLog: (
			message: string,
			type: 'info' | 'warn' | 'error' | 'success' = 'info',
		) => {
			const state = get()
			const newLog = {
				id: `log-${Date.now()}-${Math.random()}`,
				message,
				type,
				timestamp: Date.now(),
			}
			set({
				consoleLogs: [...state.consoleLogs, newLog],
			})
		},
	}
})
