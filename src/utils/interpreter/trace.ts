import type {
	CallbackQueueItem,
	CallStackItem,
	ConsoleLog,
	ExecutionStep,
	WebAPIItem,
} from '../../types'

export class Trace {
	readonly steps: ExecutionStep[] = []
	readonly callStack: CallStackItem[] = []
	readonly callbackQueue: CallbackQueueItem[] = []
	readonly webAPIs: WebAPIItem[] = []

	private stepId = 0

	generateId(): string {
		return `step-${++this.stepId}`
	}

	logId(): string {
		return `log-${this.stepId}`
	}

	snapshotState() {
		return {
			callStack: [...this.callStack],
			callbackQueue: [...this.callbackQueue],
			webAPIs: [...this.webAPIs],
		}
	}

	push(
		type: ExecutionStep['type'],
		description: string,
		lineNumber?: number,
		consoleLogs?: ConsoleLog[],
	): ExecutionStep {
		const step: ExecutionStep = {
			id: this.generateId(),
			type,
			description,
			lineNumber,
			state: this.snapshotState(),
			consoleLogs,
		}
		this.steps.push(step)
		return step
	}

	pushCall(name: string, lineNumber?: number): CallStackItem {
		const item: CallStackItem = { id: this.generateId(), name, lineNumber }
		this.callStack.push(item)
		return item
	}

	popCall(): void {
		this.callStack.pop()
	}
}
