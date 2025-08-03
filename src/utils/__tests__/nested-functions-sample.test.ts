import { describe, it, expect } from 'vitest'
import { CodeExecutionSimulator } from '../codeSimulator'

describe('Nested Functions Sample', () => {
	it('should correctly simulate the nested functions sample from presets', () => {
		const simulator = new CodeExecutionSimulator()

		// This is the updated code from our preset
		const nestedFunctionsCode = `function third() {
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

first();`

		const steps = simulator.simulateCode(nestedFunctionsCode)

		console.log('Updated Nested Functions Sample Execution:')
		steps.forEach((step, index) => {
			console.log(
				`${index + 1}. Line ${step.lineNumber}: ${step.type} - ${
					step.description
				}`,
			)
		})

		// Should start with first() call on line 17
		expect(steps[0].lineNumber).toBe(17)
		expect(steps[0].description).toContain('first()')

		// Should have the correct execution order with before/after logs
		const functionCallSteps = steps.filter(
			(step) =>
				step.type === 'function-call' &&
				step.description.includes('Called'),
		)

		// Should have more function calls now due to before/after logs
		expect(functionCallSteps.length).toBeGreaterThan(6)

		// Check that we have before/after patterns
		const consoleLogSteps = functionCallSteps.filter((step) =>
			step.description.includes('console.log'),
		)

		expect(consoleLogSteps.length).toBeGreaterThan(3) // Should have more than just 3 console logs now
	})
})
