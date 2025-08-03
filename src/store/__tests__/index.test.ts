import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../index'

describe('App Store', () => {
	beforeEach(() => {
		// Reset store state before each test
		useAppStore.getState().reset()
	})

	describe('Initial State', () => {
		it('should have correct initial state', () => {
			const state = useAppStore.getState()

			expect(state.callStack).toEqual([])
			expect(state.callbackQueue).toEqual([])
			expect(state.webAPIs).toEqual([])
			expect(state.currentStep).toBe(0)
			expect(state.steps).toEqual([])
			expect(state.isRunning).toBe(false)
			expect(state.isPaused).toBe(false)
			expect(state.currentLine).toBeUndefined()
			expect(state.consoleLogs).toEqual([])
		})

		it('should have sample code loaded', () => {
			const state = useAppStore.getState()
			expect(state.samples).toBeDefined()
			expect(state.samples.length).toBeGreaterThan(0)
		})
	})

	describe('Code Management', () => {
		it('should set code correctly', () => {
			const testCode = 'console.log("test")'
			useAppStore.getState().setCode(testCode)

			expect(useAppStore.getState().code).toBe(testCode)
		})

		it('should load sample correctly', () => {
			const store = useAppStore.getState()
			const firstSample = store.samples[0]

			if (firstSample) {
				store.loadSample(firstSample)

				const newState = useAppStore.getState()
				expect(newState.code).toBe(firstSample.code)
				expect(newState.currentSample).toEqual(firstSample)
			}
		})
	})

	describe('Execution Control', () => {
		it('should reset state correctly', () => {
			const store = useAppStore.getState()

			// Set some state
			store.setCode('test code')
			store.addConsoleLog('test message')

			// Reset
			store.reset()

			const newState = useAppStore.getState()
			expect(newState.callStack).toEqual([])
			expect(newState.callbackQueue).toEqual([])
			expect(newState.webAPIs).toEqual([])
			expect(newState.currentStep).toBe(0)
			expect(newState.consoleLogs).toEqual([])
		})

		it('should add console logs correctly', () => {
			const store = useAppStore.getState()

			store.addConsoleLog('Test message', 'info')

			const logs = useAppStore.getState().consoleLogs
			expect(logs).toHaveLength(1)
			expect(logs[0].message).toBe('Test message')
			expect(logs[0].type).toBe('info')
			expect(logs[0].timestamp).toBeDefined()
		})
	})

	describe('Sample Categories', () => {
		it('should have different sample categories', () => {
			const state = useAppStore.getState()
			const categories = [
				...new Set(state.samples.map((sample) => sample.category)),
			]

			expect(categories.length).toBeGreaterThan(1)
			expect(categories).toContain('timers')
		})

		it('should have samples with required properties', () => {
			const state = useAppStore.getState()

			state.samples.forEach((sample) => {
				expect(sample).toHaveProperty('id')
				expect(sample).toHaveProperty('title')
				expect(sample).toHaveProperty('description')
				expect(sample).toHaveProperty('category')
				expect(sample).toHaveProperty('code')
				expect(typeof sample.code).toBe('string')
				expect(sample.code.length).toBeGreaterThan(0)
			})
		})
	})
})
