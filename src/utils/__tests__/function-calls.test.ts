import { describe, it, expect } from 'vitest'
import { CodeExecutionSimulator } from '../codeSimulator'

describe('Function Calls', () => {
	it('should handle multiline function calls with console.log correctly', () => {
		const simulator = new CodeExecutionSimulator()

		const testCode = `function tenth() {
  console.log("10")
 }

function ninth() {
  console.log("9")
  tenth() }

function first() {
  console.log("1")
  ninth() }

first();`

		const steps = simulator.simulateCode(testCode)

		expect(steps[0].lineNumber).toBe(13)
		expect(steps[0].description).toContain('first()')

		const functionCallSteps = steps.filter(
			(step) =>
				step.type === 'function-call' &&
				step.description.includes('Called'),
		)

		const calledNames = functionCallSteps.map((step) => step.description)
		expect(calledNames.some((d) => d.includes('first()'))).toBe(true)
		expect(calledNames.some((d) => d.includes('ninth()'))).toBe(true)
		expect(calledNames.some((d) => d.includes('tenth()'))).toBe(true)
		expect(functionCallSteps[0].description).toContain('first()')

		const messages = steps.flatMap(
			(step) => step.consoleLogs?.map((log) => log.message) ?? [],
		)
		expect(messages).toEqual(['1', '9', '10'])
	})

	it('should handle deeply nested function calls correctly', () => {
		const simulator = new CodeExecutionSimulator()

		const testCode = `function tenth() { }

function ninth() { tenth() }

function eighth() { ninth() }

function seventh() { eighth() }

function sixth() { seventh() }

function fifth() { sixth() }

function fourth() { fifth() }

function third() { fourth() }

function second() { third() }

function first() { second() }

first();`

		const steps = simulator.simulateCode(testCode)

		const functionCallSteps = steps.filter(
			(step) =>
				step.type === 'function-call' &&
				step.description.includes('Called'),
		)

		expect(functionCallSteps).toHaveLength(10)
		const functionReturnSteps = steps.filter(
			(step) => step.type === 'function-return',
		)
		expect(functionReturnSteps).toHaveLength(10)

		expect(
			functionCallSteps.find((step) =>
				step.description.includes('first()'),
			),
		).toBeTruthy()
		expect(
			functionCallSteps.find((step) =>
				step.description.includes('tenth()'),
			),
		).toBeTruthy()
	})

	it('should support real arguments, return values, and recursion', () => {
		const simulator = new CodeExecutionSimulator()

		const testCode = `function factorial(n) {
  if (n <= 1) return 1
  return n * factorial(n - 1)
}
console.log(factorial(5))`

		const steps = simulator.simulateCode(testCode)

		const messages = steps.flatMap(
			(step) => step.consoleLogs?.map((log) => log.message) ?? [],
		)
		expect(messages).toEqual(['120'])

		const factorialCalls = steps.filter(
			(step) =>
				step.type === 'function-call' &&
				step.description.includes('factorial()'),
		)
		expect(factorialCalls).toHaveLength(5)
	})
})
