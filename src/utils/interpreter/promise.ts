import type { Scheduler } from './scheduler'
import type { Value } from './environment'

type Reaction = {
	onFulfilled?: (value: Value) => void
	onRejected?: (reason: Value) => void
}

export class SimulatedPromise {
	state: 'pending' | 'fulfilled' | 'rejected' = 'pending'
	value: Value = undefined

	private reactions: Reaction[] = []
	private readonly scheduler: Scheduler

	constructor(scheduler: Scheduler) {
		this.scheduler = scheduler
	}

	resolve(value: Value): void {
		if (this.state !== 'pending') return
		if (value instanceof SimulatedPromise) {
			value.registerReaction(
				(v) => this.resolve(v),
				(r) => this.reject(r),
			)
			return
		}
		this.state = 'fulfilled'
		this.value = value
		this.flush()
	}

	reject(reason: Value): void {
		if (this.state !== 'pending') return
		this.state = 'rejected'
		this.value = reason
		this.flush()
	}

	registerReaction(
		onFulfilled?: (value: Value) => void,
		onRejected?: (reason: Value) => void,
	): void {
		if (this.state === 'pending') {
			this.reactions.push({ onFulfilled, onRejected })
			return
		}
		const reaction = { onFulfilled, onRejected }
		this.scheduler.enqueueMicrotask(() => this.runReaction(reaction))
	}

	private flush(): void {
		const pending = this.reactions
		this.reactions = []
		for (const reaction of pending) {
			this.scheduler.enqueueMicrotask(() => this.runReaction(reaction))
		}
	}

	private runReaction(reaction: Reaction): void {
		if (this.state === 'fulfilled') reaction.onFulfilled?.(this.value)
		else if (this.state === 'rejected') reaction.onRejected?.(this.value)
	}
}
