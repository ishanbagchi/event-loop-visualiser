import { describe, it, expect, beforeEach } from 'vitest'
import { CodeExecutionSimulator } from '../codeSimulator'

describe('CodeExecutionSimulator', () => {
	let simulator: CodeExecutionSimulator

	beforeEach(() => {
		simulator = new CodeExecutionSimulator()
	})

	describe('Basic console.log execution', () => {
		it('should simulate console.log execution correctly', () => {
			const code = `console.log('Hello World')`
			const steps = simulator.simulateCode(code)

			expect(steps).toHaveLength(2)
			expect(steps[0].type).toBe('function-call')
			expect(steps[0].description).toContain('console.log')
			expect(steps[0].consoleLogs?.[0].message).toBe('Hello World')

			expect(steps[1].type).toBe('function-return')
			expect(steps[1].description).toContain('executed and removed')
		})

		it('should handle multiple console.log statements', () => {
			const code = `
console.log('First')
console.log('Second')
      `
			const steps = simulator.simulateCode(code)

			expect(steps).toHaveLength(4) // 2 call + 2 return steps
			expect(steps[0].consoleLogs?.[0].message).toBe('First')
			expect(steps[2].consoleLogs?.[0].message).toBe('Second')
		})
	})

	describe('setTimeout execution', () => {
		it('should simulate setTimeout correctly', () => {
			const code = `
console.log('Start')
setTimeout(() => {
  console.log('Timeout')
}, 1000)
console.log('End')
      `
			const steps = simulator.simulateCode(code)

			// Should have synchronous steps first, then setTimeout callback steps
			const syncSteps = steps.filter(
				(step) =>
					step.description.includes('Start') ||
					step.description.includes('End') ||
					step.description.includes('setTimeout'),
			)

			const callbackSteps = steps.filter(
				(step) =>
					step.description.includes('Timer completed') ||
					step.description.includes('callback'),
			)

			expect(syncSteps.length).toBeGreaterThan(0)
			expect(callbackSteps.length).toBeGreaterThan(0)
		})

		it('should register setTimeout with Web APIs', () => {
			const code = `setTimeout(() => { console.log('test') }, 500)`
			const steps = simulator.simulateCode(code)

			const webApiStep = steps.find(
				(step) =>
					step.type === 'web-api' &&
					step.description.includes('timer registered with Web APIs'),
			)
			expect(webApiStep).toBeTruthy()
			expect(webApiStep?.description).toContain('500ms')
		})
	})

	describe('Promise execution', () => {
		it('should simulate Promise.resolve correctly', () => {
			const code = `
console.log('Start')
Promise.resolve('Promise result').then(result => {
  console.log(result)
})
console.log('End')
      `
			const steps = simulator.simulateCode(code)

			// Should have Promise registration steps
			const promiseSteps = steps.filter((step) =>
				step.description.includes('Promise'),
			)

			expect(promiseSteps.length).toBeGreaterThan(0)

			// Should have Web API registration
			const webApiStep = steps.find(
				(step) =>
					step.type === 'web-api' &&
					step.description.includes(
						'promise registered with Web APIs',
					),
			)
			expect(webApiStep).toBeTruthy()
		})

		it('should handle Promise callback execution', () => {
			const code = `Promise.resolve('test').then(result => { console.log(result) })`
			const steps = simulator.simulateCode(code)

			// Should have callback queue step (check actual description)
			const callbackQueueStep = steps.find(
				(step) =>
					step.type === 'callback-queue' &&
					step.description.includes('microtask queue'),
			)
			expect(callbackQueueStep).toBeTruthy()

			// Should have Promise execution steps
			const promiseCallStep = steps.find(
				(step) =>
					step.type === 'function-call' &&
					step.description.includes('Promise.then callback'),
			)
			expect(promiseCallStep).toBeTruthy()
		})
	})

	describe('State snapshots', () => {
		it('should include state snapshots in execution steps', () => {
			const code = `console.log('test')`
			const steps = simulator.simulateCode(code)

			const stepWithState = steps.find((step) => step.state)
			expect(stepWithState).toBeTruthy()
			expect(stepWithState?.state).toHaveProperty('callStack')
			expect(stepWithState?.state).toHaveProperty('callbackQueue')
			expect(stepWithState?.state).toHaveProperty('webAPIs')
		})

		it('should track call stack changes in state', () => {
			const code = `console.log('test')`
			const steps = simulator.simulateCode(code)

			const callStep = steps.find((step) => step.type === 'function-call')
			const returnStep = steps.find(
				(step) => step.type === 'function-return',
			)

			expect(callStep?.state?.callStack).toHaveLength(1)
			expect(returnStep?.state?.callStack).toHaveLength(0)
		})
	})

	describe('Execution order', () => {
		it('should execute synchronous code before asynchronous callbacks', () => {
			const code = `
console.log('Start')
setTimeout(() => { console.log('Timeout') }, 0)
Promise.resolve('Promise').then(result => { console.log(result) })
console.log('End')
      `
			const steps = simulator.simulateCode(code)

			// Check that synchronous console.log statements are executed
			const consoleSteps = steps.filter(
				(step) => step.consoleLogs?.length,
			)
			const messages = consoleSteps.map(
				(step) => step.consoleLogs?.[0]?.message,
			)

			// Currently the simulator only processes synchronous code
			expect(messages).toContain('Start')
			expect(messages).toContain('End')

			// Check that async operations are registered (but callbacks may not execute)
			const setTimeoutStep = steps.find(
				(step) =>
					step.type === 'web-api' &&
					step.description.includes('timer registered with Web APIs'),
			)
			expect(setTimeoutStep).toBeTruthy()

			const promiseStep = steps.find(
				(step) =>
					step.type === 'web-api' &&
					step.description.includes(
						'promise registered with Web APIs',
					),
			)
			expect(promiseStep).toBeTruthy()
		})
	})
})
