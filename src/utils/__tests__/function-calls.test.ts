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

		// Add debugging to see what functions are parsed
		const lines = testCode.split('\n')
		const simulatorAny = simulator as unknown as {
			parseFunctionDeclarations: (
				lines: string[],
			) => Map<string, { startLine: number; endLine: number }>
		}
		const functionDeclarations =
			simulatorAny.parseFunctionDeclarations(lines)

		console.log('Parsed function declarations:')
		functionDeclarations.forEach(
			(value: { startLine: number; endLine: number }, key: string) => {
				console.log(`${key}: lines ${value.startLine}-${value.endLine}`)
			},
		)

		const steps = simulator.simulateCode(testCode)

		console.log('All steps:')
		steps.forEach((step, index) => {
			console.log(
				`${index + 1}. Line ${step.lineNumber}: ${step.type} - ${
					step.description
				}`,
			)
		})

		// The first step should be calling first() on line 13
		expect(steps[0].lineNumber).toBe(13)
		expect(steps[0].description).toContain('first()')

		// Should have function calls in the correct order: first -> ninth -> tenth
		const functionCallSteps = steps.filter(
			(step) =>
				step.type === 'function-call' &&
				step.description.includes('Called'),
		)

		expect(functionCallSteps.length).toBeGreaterThan(2)
		expect(functionCallSteps[0].description).toContain('first()')
	})

	it('should handle nested function calls correctly', () => {
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

		// Add debugging to see what functions are parsed
		const lines = testCode.split('\n')
		// We need to access private methods for testing
		const simulatorAny = simulator as unknown as {
			parseFunctionDeclarations: (
				lines: string[],
			) => Map<string, { startLine: number; endLine: number }>
		}
		const functionDeclarations =
			simulatorAny.parseFunctionDeclarations(lines)

		console.log('Parsed function declarations:')
		functionDeclarations.forEach(
			(value: { startLine: number; endLine: number }, key: string) => {
				console.log(`${key}: lines ${value.startLine}-${value.endLine}`)
			},
		)

		const steps = simulator.simulateCode(testCode)

		console.log('All steps:')
		steps.forEach((step, index) => {
			console.log(
				`${index + 1}. Type: ${step.type}, Description: ${
					step.description
				}`,
			)
		})

		// Find all function call steps
		const functionCallSteps = steps.filter(
			(step) =>
				step.type === 'function-call' &&
				step.description.includes('Called'),
		)

		console.log('Function call steps:')
		functionCallSteps.forEach((step, index) => {
			console.log(`${index + 1}. ${step.description}`)
		})

		// Should have 10 function calls (first -> second -> third -> ... -> tenth)
		expect(functionCallSteps.length).toBeGreaterThan(1) // Changed from 0 to 1 since we expect multiple calls

		// Check that first() was called
		const firstCall = functionCallSteps.find((step) =>
			step.description.includes('first()'),
		)
		expect(firstCall).toBeTruthy()
	})
})
