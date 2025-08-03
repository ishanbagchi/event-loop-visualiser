import { describe, it, expect } from 'vitest'
import { useAppStore } from '../index'

describe('Store Samples', () => {
	it('should include the nested functions sample', () => {
		const store = useAppStore.getState()

		// Find the nested functions sample
		const nestedFunctionsSample = store.samples.find(
			(sample) => sample.id === 'nested-functions',
		)

		expect(nestedFunctionsSample).toBeDefined()
		expect(nestedFunctionsSample?.title).toBe('Nested Function Calls')
		expect(nestedFunctionsSample?.description).toBe(
			'Functions calling other functions with console.log',
		)
		expect(nestedFunctionsSample?.category).toBe('basic')

		// Verify the code content
		expect(nestedFunctionsSample?.code).toContain('function third()')
		expect(nestedFunctionsSample?.code).toContain('function second()')
		expect(nestedFunctionsSample?.code).toContain('function first()')
		expect(nestedFunctionsSample?.code).toContain('first();')

		console.log('Nested Functions Sample found:')
		console.log(`Title: ${nestedFunctionsSample?.title}`)
		console.log(`Description: ${nestedFunctionsSample?.description}`)
		console.log(`Category: ${nestedFunctionsSample?.category}`)
	})

	it('should load the nested functions sample correctly', () => {
		const store = useAppStore.getState()

		// Find and load the nested functions sample
		const nestedFunctionsSample = store.samples.find(
			(sample) => sample.id === 'nested-functions',
		)
		expect(nestedFunctionsSample).toBeDefined()

		// Load the sample
		store.loadSample(nestedFunctionsSample!)

		const updatedState = useAppStore.getState()
		expect(updatedState.currentSample?.id).toBe('nested-functions')
		expect(updatedState.code).toBe(nestedFunctionsSample!.code)

		// Verify that steps are generated
		expect(updatedState.steps.length).toBeGreaterThan(0)

		console.log(
			`Successfully loaded sample with ${updatedState.steps.length} execution steps`,
		)
	})
})
