import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExecutionControls } from '../ExecutionControls'
import { useAppStore } from '../../store'

vi.mock('../../store', () => ({
	useAppStore: vi.fn(),
}))

const mockStore = {
	isRunning: false,
	isPaused: false,
	currentStep: 0,
	steps: [],
	play: vi.fn(),
	pause: vi.fn(),
	step: vi.fn(),
	back: vi.fn(),
	reset: vi.fn(),
}

const mockUseAppStoreState = (state: Record<string, unknown>) => {
	vi.mocked(useAppStore).mockImplementation(
		((selector?: (s: Record<string, unknown>) => unknown) =>
			selector ? selector(state) : state) as typeof useAppStore,
	)
}

describe('ExecutionControls - Simple Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should show "No Code Loaded" when steps array is empty', () => {
		mockUseAppStoreState({
			...mockStore,
			isRunning: false,
			isPaused: false,
			currentStep: 0,
			steps: [],
		})

		render(<ExecutionControls />)

		expect(screen.getByText('No Code Loaded')).toBeInTheDocument()
	})

	it('should show "Ready to Start" when steps are available but not started', () => {
		mockUseAppStoreState({
			...mockStore,
			isRunning: false,
			isPaused: false,
			currentStep: 0,
			steps: [
				{
					type: 'function-call',
					description: 'Test step',
					lineNumber: 1,
				},
			],
		})

		render(<ExecutionControls />)

		expect(screen.getByText('Ready to Start')).toBeInTheDocument()
	})

	it('should show "Execution Complete" when currentStep equals steps length', () => {
		mockUseAppStoreState({
			...mockStore,
			isRunning: false,
			isPaused: false,
			currentStep: 1,
			steps: [
				{
					type: 'function-call',
					description: 'Test step',
					lineNumber: 1,
				},
			],
		})

		render(<ExecutionControls />)

		expect(screen.getByText('Execution Complete')).toBeInTheDocument()
	})
})
