import { describe, it, expect } from 'vitest'
import { useAppStore } from '../index'

describe('Store Samples', () => {
	it('should include the nested functions sample', () => {
		const store = useAppStore.getState()

		const nestedFunctionsSample = store.samples.find(
			(sample) => sample.id === 'nested-functions',
		)

		expect(nestedFunctionsSample).toBeDefined()
		expect(nestedFunctionsSample?.title).toBe('Nested Function Calls')
		expect(nestedFunctionsSample?.description).toBe(
			'Functions calling other functions with console.log',
		)
		expect(nestedFunctionsSample?.category).toBe('basic')

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

		const nestedFunctionsSample = store.samples.find(
			(sample) => sample.id === 'nested-functions',
		)
		expect(nestedFunctionsSample).toBeDefined()

		store.loadSample(nestedFunctionsSample!)

		const updatedState = useAppStore.getState()
		expect(updatedState.currentSample?.id).toBe('nested-functions')
		expect(updatedState.code).toBe(nestedFunctionsSample!.code)

		expect(updatedState.steps.length).toBeGreaterThan(0)

		console.log(
			`Successfully loaded sample with ${updatedState.steps.length} execution steps`,
		)
	})
})
