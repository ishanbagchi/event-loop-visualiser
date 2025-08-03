import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExecutionControls } from '../ExecutionControls'
import { useAppStore } from '../../store'

// Mock the store
vi.mock('../../store', () => ({
	useAppStore: vi.fn(),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
	Play: () => <div data-testid="play-icon" />,
	Pause: () => <div data-testid="pause-icon" />,
	SkipForward: () => <div data-testid="skip-forward-icon" />,
	RotateCcw: () => <div data-testid="rotate-ccw-icon" />,
	Square: () => <div data-testid="square-icon" />,
}))

const mockStore = {
	isRunning: false,
	isPaused: false,
	currentStep: 0,
	steps: [],
	play: vi.fn(),
	pause: vi.fn(),
	step: vi.fn(),
	reset: vi.fn(),
	restart: vi.fn(),
}

describe('ExecutionControls - Simple Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should show "No Code Loaded" when steps array is empty', () => {
		vi.mocked(useAppStore).mockReturnValue({
			...mockStore,
			isRunning: false,
			isPaused: false,
			currentStep: 0,
			steps: [],
		})

		render(<ExecutionControls />)

		// Debug: let's see what's actually rendered
		screen.debug()

		expect(screen.getByText('No Code Loaded')).toBeInTheDocument()
	})

	it('should show "Ready to Start" when steps are available but not started', () => {
		vi.mocked(useAppStore).mockReturnValue({
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
		vi.mocked(useAppStore).mockReturnValue({
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
