import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('ExecutionControls', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseAppStoreState({
			...mockStore,
			isRunning: false,
			isPaused: false,
			currentStep: 0,
			steps: [],
		})
	})

	describe('Initial State - No Code Loaded', () => {
		beforeEach(() => {
			mockUseAppStoreState({
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

		it('should show a 0 / 0 tick label', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Tick 0 / 0')).toBeInTheDocument()
		})

		it('should disable play, step and reset buttons when no steps are available', () => {
			render(<ExecutionControls />)

			expect(screen.getByRole('button', { name: /play/i })).toBeDisabled()
			expect(screen.getByRole('button', { name: /step/i })).toBeDisabled()
			expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled()
		})

		it('should disable the back button when nothing has run yet', () => {
			render(<ExecutionControls />)

			expect(screen.getByRole('button', { name: /back/i })).toBeDisabled()
		})
	})

	describe('Ready to Start State', () => {
		beforeEach(() => {
			mockUseAppStoreState({
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

		it('should enable play, step and reset buttons when steps are available', () => {
			render(<ExecutionControls />)

			expect(screen.getByRole('button', { name: /play/i })).toBeEnabled()
			expect(screen.getByRole('button', { name: /step/i })).toBeEnabled()
			expect(screen.getByRole('button', { name: /reset/i })).toBeEnabled()
		})

		it('should show a 0 / 1 tick label', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Tick 0 / 1')).toBeInTheDocument()
		})
	})

	describe('Running State', () => {
		beforeEach(() => {
			mockUseAppStoreState({
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
				currentStep: 1,
			})
		})

		it('should show "Running" status when execution is active', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Running')).toBeInTheDocument()
		})

		it('should show the play button labelled Pause when running', () => {
			render(<ExecutionControls />)

			expect(
				screen.getByRole('button', { name: /pause/i }),
			).toBeInTheDocument()
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
			mockUseAppStoreState({
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
				currentStep: 1,
			})
		})

		it('should show "Paused" status when execution is paused', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Paused')).toBeInTheDocument()
		})

		it('should show the play button labelled Play when paused', () => {
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
			mockUseAppStoreState({
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
				currentStep: 1,
			})
		})

		it('should show "Stopped" status when execution has started but is not running', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Stopped')).toBeInTheDocument()
		})

		it('should enable play, step and back buttons when stopped', () => {
			render(<ExecutionControls />)

			expect(screen.getByRole('button', { name: /play/i })).toBeEnabled()
			expect(screen.getByRole('button', { name: /step/i })).toBeEnabled()
			expect(screen.getByRole('button', { name: /back/i })).toBeEnabled()
		})

		it('should show a 1 / 2 tick label', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Tick 1 / 2')).toBeInTheDocument()
		})
	})

	describe('Execution Complete State', () => {
		beforeEach(() => {
			mockUseAppStoreState({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
				currentStep: 1,
			})
		})

		it('should show "Execution Complete" status when all steps are completed', () => {
			render(<ExecutionControls />)

			expect(screen.getByText('Execution Complete')).toBeInTheDocument()
		})

		it('should disable the step button but keep Replay enabled when execution is complete', () => {
			render(<ExecutionControls />)

			expect(
				screen.getByRole('button', { name: /replay/i }),
			).toBeEnabled()
			expect(screen.getByRole('button', { name: /step/i })).toBeDisabled()
		})

		it('should show the play button labelled Replay when complete', () => {
			render(<ExecutionControls />)

			expect(
				screen.getByRole('button', { name: /replay/i }),
			).toBeInTheDocument()
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
			mockUseAppStoreState({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
				currentStep: 1,
			})
		})

		it('should call play function when play button is clicked', async () => {
			mockUseAppStoreState({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
					{
						type: 'function-call',
						description: 'Test step 2',
						lineNumber: 2,
					},
				],
				currentStep: 1,
			})
			render(<ExecutionControls />)

			await user.click(screen.getByRole('button', { name: /play/i }))
			expect(mockStore.play).toHaveBeenCalledOnce()
		})

		it('should call step function when step button is clicked', async () => {
			mockUseAppStoreState({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
					{
						type: 'function-call',
						description: 'Test step 2',
						lineNumber: 2,
					},
				],
				currentStep: 0,
			})
			render(<ExecutionControls />)

			await user.click(screen.getByRole('button', { name: /step/i }))
			expect(mockStore.step).toHaveBeenCalledOnce()
		})

		it('should call back function when back button is clicked', async () => {
			render(<ExecutionControls />)

			await user.click(screen.getByRole('button', { name: /back/i }))
			expect(mockStore.back).toHaveBeenCalledOnce()
		})

		it('should call reset function when reset button is clicked', async () => {
			render(<ExecutionControls />)

			await user.click(screen.getByRole('button', { name: /reset/i }))
			expect(mockStore.reset).toHaveBeenCalledOnce()
		})

		it('should call pause function when pause button is clicked during execution', async () => {
			mockUseAppStoreState({
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
			mockUseAppStoreState({
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
			mockUseAppStoreState({
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
				currentStep: 1,
			})

			render(<ExecutionControls />)

			const statusDiv = screen.getByText('Stopped').parentElement
			const statusIndicator =
				statusDiv?.querySelector('.status-indicator')
			expect(statusIndicator).toHaveStyle('background-color: #f59e0b')
		})

		it('should show gray indicator for "No Code Loaded" state', () => {
			mockUseAppStoreState({
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

	describe('Progress bar', () => {
		it('should render a full-width progress fill when execution is complete', () => {
			mockUseAppStoreState({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
				currentStep: 1,
			})

			const { container } = render(<ExecutionControls />)

			const fill = container.querySelector('.progress-fill')
			expect(fill).toHaveStyle('width: 100%')
		})

		it('should render an empty progress fill before anything has run', () => {
			mockUseAppStoreState({
				...mockStore,
				steps: [
					{
						type: 'function-call',
						description: 'Test step',
						lineNumber: 1,
					},
				],
				currentStep: 0,
			})

			const { container } = render(<ExecutionControls />)

			const fill = container.querySelector('.progress-fill')
			expect(fill).toHaveStyle('width: 0%')
		})
	})
})
