interface Macrotask {
	delay: number
	seq: number
	run: () => void
}

export class Scheduler {
	private macrotasks: Macrotask[] = []
	private microtasks: Array<() => void> = []
	private seq = 0
	private now = 0

	enqueueMacrotask(delay: number, run: () => void): void {
		this.macrotasks.push({ delay: this.now + delay, seq: this.seq++, run })
	}

	enqueueMicrotask(run: () => void): void {
		this.microtasks.push(run)
	}

	private drainMicrotasks(): void {
		while (this.microtasks.length > 0) {
			const task = this.microtasks.shift()
			task?.()
		}
	}

	run(): void {
		this.drainMicrotasks()
		while (this.macrotasks.length > 0) {
			this.macrotasks.sort((a, b) => a.delay - b.delay || a.seq - b.seq)
			const next = this.macrotasks.shift()
			if (!next) break
			this.now = Math.max(this.now, next.delay)
			next.run()
			this.drainMicrotasks()
		}
	}
}
