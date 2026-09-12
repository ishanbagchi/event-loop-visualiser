import { describe, it, expect } from 'vitest'
import { Scheduler } from '../scheduler'
import { SimulatedPromise } from '../promise'

describe('SimulatedPromise', () => {
	it('runs a reaction registered before resolve() as a microtask', () => {
		const scheduler = new Scheduler()
		const promise = new SimulatedPromise(scheduler)
		let received: unknown
		promise.registerReaction((v) => {
			received = v
		})
		promise.resolve(42)
		expect(received).toBeUndefined()
		scheduler.run()
		expect(received).toBe(42)
	})

	it('runs a reaction registered after resolve() as a microtask too', () => {
		const scheduler = new Scheduler()
		const promise = new SimulatedPromise(scheduler)
		promise.resolve('done')
		let received: unknown
		promise.registerReaction((v) => {
			received = v
		})
		expect(received).toBeUndefined()
		scheduler.run()
		expect(received).toBe('done')
	})

	it('routes rejection to onRejected, not onFulfilled', () => {
		const scheduler = new Scheduler()
		const promise = new SimulatedPromise(scheduler)
		let fulfilled = false
		let rejectedWith: unknown
		promise.registerReaction(
			() => {
				fulfilled = true
			},
			(reason) => {
				rejectedWith = reason
			},
		)
		promise.reject('boom')
		scheduler.run()
		expect(fulfilled).toBe(false)
		expect(rejectedWith).toBe('boom')
	})

	it('ignores settlement after the promise has already settled', () => {
		const scheduler = new Scheduler()
		const promise = new SimulatedPromise(scheduler)
		promise.resolve(1)
		promise.resolve(2)
		promise.reject('nope')
		scheduler.run()
		expect(promise.state).toBe('fulfilled')
		expect(promise.value).toBe(1)
	})

	it('adopts the state of a promise it is resolved with', () => {
		const scheduler = new Scheduler()
		const inner = new SimulatedPromise(scheduler)
		const outer = new SimulatedPromise(scheduler)
		outer.resolve(inner)
		inner.resolve('inner value')
		scheduler.run()
		expect(outer.state).toBe('fulfilled')
		expect(outer.value).toBe('inner value')
	})
})
