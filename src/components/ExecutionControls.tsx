import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from 'lucide-react'
import { useAppStore } from '../store'
import { useShallow } from 'zustand/react/shallow'

export const ExecutionControls = () => {
	const { isRunning, isPaused, currentStep, steps, play, pause, step, back, reset } =
		useAppStore(
			useShallow((state) => ({
				isRunning: state.isRunning,
				isPaused: state.isPaused,
				currentStep: state.currentStep,
				steps: state.steps,
				play: state.play,
				pause: state.pause,
				step: state.step,
				back: state.back,
				reset: state.reset,
			})),
		)

	const hasSteps = steps.length > 0
	const hasStarted = currentStep > 0
	const isComplete = hasSteps && currentStep >= steps.length
	const isActivelyRunning = isRunning && !isPaused

	const tickLabel = hasSteps
		? `${Math.min(currentStep, steps.length)} / ${steps.length}`
		: '0 / 0'
	const progressPct = hasSteps
		? Math.round((Math.min(currentStep, steps.length) / steps.length) * 100)
		: 0

	const playLabel = isActivelyRunning ? 'Pause' : isComplete ? 'Replay' : 'Play'

	const handlePlayClick = () => {
		if (isActivelyRunning) {
			pause()
			return
		}
		play()
	}

	return (
		<div className="execution-controls">
			<div className="controls-row">
				<div className="controls-buttons">
					<button
						type="button"
						onClick={handlePlayClick}
						disabled={!hasSteps}
						className="control-btn-play"
					>
						{isActivelyRunning ? (
							<Pause size={16} />
						) : isComplete ? (
							<RotateCcw size={16} />
						) : (
							<Play size={16} />
						)}
						{playLabel}
					</button>

					<button
						type="button"
						onClick={step}
						disabled={isComplete || !hasSteps}
						className="control-btn-step"
					>
						Step
						<ArrowRight size={16} />
					</button>

					<button
						type="button"
						onClick={back}
						disabled={!hasStarted}
						className="control-btn-back"
					>
						<ArrowLeft size={16} />
						Back
					</button>

					<button
						type="button"
						onClick={reset}
						disabled={!hasSteps}
						className="control-btn-reset"
					>
						Reset
					</button>
				</div>

				<div className="status">
					{isComplete ? (
						<>
							<div
								className="status-indicator"
								style={{ backgroundColor: '#10b981' }}
							></div>
							Execution Complete
						</>
					) : isActivelyRunning ? (
						<>
							<div className="status-indicator running"></div>
							Running
						</>
					) : isPaused ? (
						<>
							<div className="status-indicator paused"></div>
							Paused
						</>
					) : hasStarted ? (
						<>
							<div
								className="status-indicator"
								style={{ backgroundColor: '#f59e0b' }}
							></div>
							Stopped
						</>
					) : hasSteps ? (
						<>
							<div
								className="status-indicator"
								style={{ backgroundColor: '#3b82f6' }}
							></div>
							Ready to Start
						</>
					) : (
						<>
							<div
								className="status-indicator"
								style={{ backgroundColor: '#6b7280' }}
							></div>
							No Code Loaded
						</>
					)}
					<span className="tick-label">Tick {tickLabel}</span>
				</div>
			</div>

			<div className="progress-track">
				<div
					className="progress-fill"
					style={{ width: `${progressPct}%` }}
				/>
			</div>
		</div>
	)
}
