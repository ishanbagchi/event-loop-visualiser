import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('ExecutionControls', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Reset to default state
		vi.mocked(useAppStore).mockReturnValue({
			...mockStore,
			isRunning: false,
			isPaused: false,
			currentStep: 0,
			steps: [],
		})
	})

	describe('Initial State - No Code Loaded', () => {
		beforeEach(() => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				isRunning: false,
				isPaused: false,
				currentStep: 0,
				steps: [],
			})
		})

		it('should show "No Code Loaded" status when no steps are available', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('No Code Loaded')).toBeInTheDocument()
		})

		it('should disable play and step buttons when no steps are available', () => {
			render(<ExecutionControls />)

			expect(screen.getByRole('button', { name: /play/i })).toBeDisabled()
			expect(screen.getByRole('button', { name: /step/i })).toBeDisabled()
		})

		it('should enable restart and reset buttons even when no steps are available', () => {
			render(<ExecutionControls />)

			expect(
				screen.getByRole('button', { name: /restart/i }),
			).toBeEnabled()
			expect(screen.getByRole('button', { name: /reset/i })).toBeEnabled()
		})
	})

	describe('Ready to Start State', () => {
		beforeEach(() => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
			})
		})

		it('should show "Ready to Start" status when steps are available but not started', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Ready to Start')).toBeInTheDocument()
		})

		it('should enable play and step buttons when steps are available', () => {
			render(<ExecutionControls />)

			expect(screen.getByRole('button', { name: /play/i })).toBeEnabled()
			expect(screen.getByRole('button', { name: /step/i })).toBeEnabled()
		})

		it('should show restart button with outline variant when not complete', () => {
			render(<ExecutionControls />)

			const restartButton = screen.getByRole('button', {
				name: /restart/i,
			})
			expect(restartButton).toHaveClass('btn-outline')
		})
	})

	describe('Running State', () => {
		beforeEach(() => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				isRunning: true,
				steps: [
					{
						type: 'function-call',
						description: 'Test step 1',
						lineNumber: 1,
					},
					{
						type: 'function-call',
						description: 'Test step 2',
						lineNumber: 2,
					},
				],
				currentStep: 1, // Still has more steps to run
			})
		})

		it('should show "Running" status when execution is active', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Running')).toBeInTheDocument()
		})

		it('should show pause button instead of play button when running', () => {
			render(<ExecutionControls />)

			expect(
				screen.getByRole('button', { name: /pause/i }),
			).toBeInTheDocument()
			expect(
				screen.queryByRole('button', { name: /play/i }),
			).not.toBeInTheDocument()
		})

		it('should show running status indicator with proper class', () => {
			render(<ExecutionControls />)

			const statusDiv = screen.getByText('Running').parentElement
			const statusIndicator =
				statusDiv?.querySelector('.status-indicator')
			expect(statusIndicator).toHaveClass('status-indicator')
			expect(statusIndicator).toHaveClass('running')
		})
	})

	describe('Paused State', () => {
		beforeEach(() => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				isPaused: true,
				steps: [
					{
						type: 'function-call',
						description: 'Test step 1',
						lineNumber: 1,
					},
					{
						type: 'function-call',
						description: 'Test step 2',
						lineNumber: 2,
					},
				],
				currentStep: 1, // Still has more steps to run
			})
		})

		it('should show "Paused" status when execution is paused', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Paused')).toBeInTheDocument()
		})

		it('should show play button when paused', () => {
			render(<ExecutionControls />)

			expect(
				screen.getByRole('button', { name: /play/i }),
			).toBeInTheDocument()
		})

		it('should show paused status indicator with proper class', () => {
			render(<ExecutionControls />)

			const statusDiv = screen.getByText('Paused').parentElement
			const statusIndicator =
				statusDiv?.querySelector('.status-indicator')
			expect(statusIndicator).toHaveClass('status-indicator')
			expect(statusIndicator).toHaveClass('paused')
		})
	})

	describe('Stopped State', () => {
		beforeEach(() => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step 1',
						lineNumber: 1,
					},
					{
						type: 'function-call',
						description: 'Test step 2',
						lineNumber: 2,
					},
				],
				currentStep: 1, // Started but not running, still has more steps
			})
		})

		it('should show "Stopped" status when execution has started but is not running', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Stopped')).toBeInTheDocument()
		})

		it('should enable play and step buttons when stopped', () => {
			render(<ExecutionControls />)

			expect(screen.getByRole('button', { name: /play/i })).toBeEnabled()
			expect(screen.getByRole('button', { name: /step/i })).toBeEnabled()
		})
	})

	describe('Execution Complete State', () => {
		beforeEach(() => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
				currentStep: 1, // currentStep >= steps.length (1)
			})
		})

		it('should show "Execution Complete" status when all steps are completed', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Execution Complete')).toBeInTheDocument()
		})

		it('should disable play and step buttons when execution is complete', () => {
			render(<ExecutionControls />)

			expect(screen.getByRole('button', { name: /play/i })).toBeDisabled()
			expect(screen.getByRole('button', { name: /step/i })).toBeDisabled()
		})

		it('should show restart button with primary variant when complete', () => {
			render(<ExecutionControls />)

			const restartButton = screen.getByRole('button', {
				name: /restart/i,
			})
			expect(restartButton).toHaveClass('btn-primary')
		})

		it('should show complete status indicator with green background', () => {
			render(<ExecutionControls />)

			const statusDiv =
				screen.getByText('Execution Complete').parentElement
			const statusIndicator =
				statusDiv?.querySelector('.status-indicator')
			expect(statusIndicator).toHaveStyle('background-color: #10b981')
		})
	})

	describe('Button Interactions', () => {
		const user = userEvent.setup()

		beforeEach(() => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
			})
		})

		it('should call play function when play button is clicked', async () => {
			render(<ExecutionControls />)

			await user.click(screen.getByRole('button', { name: /play/i }))
			expect(mockStore.play).toHaveBeenCalledOnce()
		})

		it('should call step function when step button is clicked', async () => {
			render(<ExecutionControls />)

			await user.click(screen.getByRole('button', { name: /step/i }))
			expect(mockStore.step).toHaveBeenCalledOnce()
		})

		it('should call restart function when restart button is clicked', async () => {
			render(<ExecutionControls />)

			await user.click(screen.getByRole('button', { name: /restart/i }))
			expect(mockStore.restart).toHaveBeenCalledOnce()
		})

		it('should call reset function when reset button is clicked', async () => {
			render(<ExecutionControls />)

			await user.click(screen.getByRole('button', { name: /reset/i }))
			expect(mockStore.reset).toHaveBeenCalledOnce()
		})

		it('should call pause function when pause button is clicked during execution', async () => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				isRunning: true,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
			})

			render(<ExecutionControls />)

			await user.click(screen.getByRole('button', { name: /pause/i }))
			expect(mockStore.pause).toHaveBeenCalledOnce()
		})
	})

	describe('Status Indicator Colors', () => {
		it('should show blue indicator for "Ready to Start" state', () => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
			})

			render(<ExecutionControls />)

			const statusDiv = screen.getByText('Ready to Start').parentElement
			const statusIndicator =
				statusDiv?.querySelector('.status-indicator')
			expect(statusIndicator).toHaveStyle('background-color: #3b82f6')
		})

		it('should show yellow indicator for "Stopped" state', () => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step 1',
						lineNumber: 1,
					},
					{
						type: 'function-call',
						description: 'Test step 2',
						lineNumber: 2,
					},
				],
				currentStep: 1, // Started but not complete
			})

			render(<ExecutionControls />)

			const statusDiv = screen.getByText('Stopped').parentElement
			const statusIndicator =
				statusDiv?.querySelector('.status-indicator')
			expect(statusIndicator).toHaveStyle('background-color: #f59e0b')
		})

		it('should show gray indicator for "No Code Loaded" state', () => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				steps: [],
				currentStep: 0,
			})

			render(<ExecutionControls />)

			const statusDiv = screen.getByText('No Code Loaded').parentElement
			const statusIndicator =
				statusDiv?.querySelector('.status-indicator')
			expect(statusIndicator).toHaveStyle('background-color: #6b7280')
		})
	})

	describe('Button Variants', () => {
		it('should show secondary variant for pause button', () => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				isRunning: true,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
			})

			render(<ExecutionControls />)

			const pauseButton = screen.getByRole('button', { name: /pause/i })
			expect(pauseButton).toHaveClass('btn-secondary')
		})

		it('should show outline variant for step and reset buttons', () => {
			vi.mocked(useAppStore).mockReturnValue({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
			})

			render(<ExecutionControls />)

			expect(screen.getByRole('button', { name: /step/i })).toHaveClass(
				'btn-outline',
			)
			expect(screen.getByRole('button', { name: /reset/i })).toHaveClass(
				'btn-outline',
			)
		})
	})
})
