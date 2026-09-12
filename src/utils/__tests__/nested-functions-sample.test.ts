import { describe, it, expect } from 'vitest'
import { CodeExecutionSimulator } from '../codeSimulator'

describe('Nested Functions Sample', () => {
	it('should correctly simulate the nested functions sample from presets', () => {
		const simulator = new CodeExecutionSimulator()

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

		expect(steps[0].lineNumber).toBe(17)
		expect(steps[0].description).toContain('first()')

		const functionCallSteps = steps.filter(
			(step) =>
				step.type === 'function-call' &&
				step.description.includes('Called'),
		)

		expect(functionCallSteps.length).toBeGreaterThan(6)

		const consoleLogSteps = functionCallSteps.filter((step) =>
			step.description.includes('console.log'),
		)

		expect(consoleLogSteps.length).toBeGreaterThan(3)
	})
})
