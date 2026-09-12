import { create } from 'zustand'
import type { ExecutionState, CodeSample, ConsoleLog } from '../types'
import { CodeExecutionSimulator } from '../utils/codeSimulator'

interface AppStore extends ExecutionState {
	code: string
	samples: CodeSample[]
	currentSample?: CodeSample

	setCode: (code: string) => void
	loadSample: (sample: CodeSample) => void
	play: () => void
	pause: () => void
	step: () => void
	back: () => void
	reset: () => void
	addConsoleLog: (
		message: string,
		type?: 'info' | 'warn' | 'error' | 'success',
		from?: 'synchronous' | 'microtask queue' | 'callback queue',
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
	{
		id: 'loop-closures',
		title: 'Loop Closures (let vs setTimeout)',
		description:
			'Classic gotcha: each `let` iteration captures its own binding, so the timers log 0, 1, 2',
		category: 'loops',
		code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log('let i =', i);
  }, 100);
}`,
	},
	{
		id: 'array-destructuring',
		title: 'Array Destructuring in a Loop',
		description: 'for...of over an array of pairs, destructured into named variables',
		category: 'loops',
		code: `const pairs = [[1, 2], [3, 4], [5, 6]];

for (const [a, b] of pairs) {
  console.log(a, '+', b, '=', a + b);
}`,
	},
	{
		id: 'classes-inheritance',
		title: 'Classes & Inheritance',
		description: 'A class hierarchy with a constructor, a method, and super',
		category: 'classes',
		code: `class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    console.log(this.name, 'makes a sound.');
  }
}

class Dog extends Animal {
  speak() {
    super.speak();
    console.log(this.name, 'barks.');
  }
}

const dog = new Dog('Rex');
dog.speak();`,
	},
	{
		id: 'async-await',
		title: 'Async/Await',
		description:
			'An async function suspends at `await` and resumes as a microtask once the promise settles',
		category: 'promises',
		code: `async function fetchData() {
  console.log('Fetching...');
  const result = await Promise.resolve('data');
  console.log('Got:', result);
  return result;
}

console.log('Start');
fetchData().then(r => console.log('Done:', r));
console.log('End');`,
	},
]

export const useAppStore = create<AppStore>((set, get) => {
	const simulator = new CodeExecutionSimulator()
	const initialSteps = simulator.simulateCode(codeSamples[0].code)

	let playIntervalId: ReturnType<typeof setInterval> | null = null

	const stopPlayback = () => {
		if (playIntervalId !== null) {
			clearInterval(playIntervalId)
			playIntervalId = null
		}
	}

	const applyToStep = (target: number) => {
		const state = get()
		const steps = state.steps
		const clamped = Math.max(0, Math.min(target, steps.length))

		let callStack = initialState.callStack
		let callbackQueue = initialState.callbackQueue
		let webAPIs = initialState.webAPIs
		let currentLine: number | undefined
		const consoleLogs: ConsoleLog[] = []

		for (let i = 0; i < clamped; i++) {
			const s = steps[i]
			if (s.state) {
				callStack = s.state.callStack
				callbackQueue = s.state.callbackQueue
				webAPIs = s.state.webAPIs
			}
			currentLine = s.lineNumber
			s.consoleLogs?.forEach((log) => {
				consoleLogs.push({
					...log,
					type: log.type === 'log' ? 'info' : log.type,
				})
			})
		}

		set({
			callStack,
			callbackQueue,
			webAPIs,
			currentLine,
			currentStep: clamped,
			consoleLogs,
		})
	}

	return {
		...initialState,
		code: codeSamples[0].code,
		samples: codeSamples,
		currentSample: codeSamples[0],
		steps: initialSteps,

		setCode: (code: string) => {
			stopPlayback()
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
				consoleLogs: [],
			})
		},

		loadSample: (sample: CodeSample) => {
			stopPlayback()
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
				consoleLogs: [],
			})
		},

		play: () => {
			const state = get()
			if (state.currentStep >= state.steps.length) return
			if (state.isRunning) return

			set({ isRunning: true, isPaused: false })

			playIntervalId = setInterval(() => {
				const currentState = get()
				if (!currentState.isRunning || currentState.isPaused) {
					stopPlayback()
					return
				}

				if (currentState.currentStep >= currentState.steps.length) {
					stopPlayback()
					set({ isRunning: false })
					return
				}

				get().step()
			}, 1500)
		},

		pause: () => {
			stopPlayback()
			set({ isPaused: true, isRunning: false })
		},

		step: () => {
			const state = get()
			if (state.currentStep >= state.steps.length) return
			applyToStep(state.currentStep + 1)
		},

		back: () => {
			stopPlayback()
			const state = get()
			applyToStep(Math.max(0, state.currentStep - 1))
			set({ isRunning: false, isPaused: false })
		},

		reset: () => {
			stopPlayback()
			const state = get()
			set({
				...initialState,
				code: state.code,
				steps: state.steps,
				currentSample: state.currentSample,
				consoleLogs: [],
			})
		},

		addConsoleLog: (
			message: string,
			type: 'info' | 'warn' | 'error' | 'success' = 'info',
			from?: 'synchronous' | 'microtask queue' | 'callback queue',
		) => {
			const state = get()
			const newLog = {
				id: `log-${Date.now()}-${Math.random()}`,
				message,
				type,
				timestamp: Date.now(),
				from,
			}
			set({
				consoleLogs: [...state.consoleLogs, newLog],
			})
		},
	}
})
