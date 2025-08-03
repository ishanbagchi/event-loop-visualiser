export interface ExecutionStep {
	id: string
	type:
		| 'function-call'
		| 'function-return'
		| 'web-api'
		| 'callback-queue'
		| 'console.log'
	description: string
	lineNumber?: number
	state?: EventLoopState
	data?: unknown
	consoleLogs?: ConsoleLog[]
}

export interface CallStackItem {
	id: string
	name: string
	args?: unknown[]
	lineNumber?: number
}

export interface CallbackQueueItem {
	id: string
	name: string
	type: 'timeout' | 'interval' | 'event' | 'promise' | 'other'
	delay?: number
	lineNumber?: number
}

export interface WebAPIItem {
	id: string
	name: string
	type: 'setTimeout' | 'setInterval' | 'DOM' | 'XHR' | 'other'
	timeRemaining?: number
	lineNumber?: number
}

export interface ConsoleLog {
	id: string
	message: string
	type: 'log' | 'info' | 'warn' | 'error' | 'success'
	timestamp: number
}

export interface EventLoopState {
	callStack: CallStackItem[]
	callbackQueue: CallbackQueueItem[]
	webAPIs: WebAPIItem[]
}

export interface ExecutionState {
	callStack: CallStackItem[]
	callbackQueue: CallbackQueueItem[]
	webAPIs: WebAPIItem[]
	currentStep: number
	steps: ExecutionStep[]
	isRunning: boolean
	isPaused: boolean
	currentLine?: number
	consoleLogs: ConsoleLog[]
}

export interface CodeSample {
	id: string
	title: string
	description: string
	code: string
	category: 'basic' | 'timers' | 'promises' | 'events'
}
