import { describe, it, expect } from 'vitest'
import { Scheduler } from '../scheduler'

describe('Scheduler', () => {
	it('drains microtasks queued before run() before any macrotask', () => {
		const scheduler = new Scheduler()
		const order: string[] = []
		scheduler.enqueueMacrotask(0, () => order.push('macro'))
		scheduler.enqueueMicrotask(() => order.push('micro'))
		scheduler.run()
		expect(order).toEqual(['micro', 'macro'])
	})

	it('orders macrotasks by delay, then registration order for ties', () => {
		const scheduler = new Scheduler()
		const order: string[] = []
		scheduler.enqueueMacrotask(100, () => order.push('b-100'))
		scheduler.enqueueMacrotask(0, () => order.push('a-0'))
		scheduler.enqueueMacrotask(0, () => order.push('c-0'))
		scheduler.run()
		expect(order).toEqual(['a-0', 'c-0', 'b-100'])
	})

	it('drains microtasks queued by one macrotask before the next macrotask runs', () => {
		const scheduler = new Scheduler()
		const order: string[] = []
		scheduler.enqueueMacrotask(0, () => {
			order.push('macro-1')
			scheduler.enqueueMicrotask(() => order.push('micro-from-macro-1'))
		})
		scheduler.enqueueMacrotask(0, () => order.push('macro-2'))
		scheduler.run()
		expect(order).toEqual(['macro-1', 'micro-from-macro-1', 'macro-2'])
	})

	it('drains microtasks that enqueue further microtasks', () => {
		const scheduler = new Scheduler()
		const order: string[] = []
		scheduler.enqueueMicrotask(() => {
			order.push('micro-1')
			scheduler.enqueueMicrotask(() => order.push('micro-2'))
		})
		scheduler.run()
		expect(order).toEqual(['micro-1', 'micro-2'])
	})

	it('offsets a macrotask scheduled from inside another macrotask by the current virtual time', () => {
		const scheduler = new Scheduler()
		const order: string[] = []
		scheduler.enqueueMacrotask(100, () => {
			order.push('outer-100')
			scheduler.enqueueMacrotask(10, () => order.push('nested-110'))
		})
		scheduler.enqueueMacrotask(105, () => order.push('sibling-105'))
		scheduler.run()
		expect(order).toEqual(['outer-100', 'sibling-105', 'nested-110'])
	})
})
