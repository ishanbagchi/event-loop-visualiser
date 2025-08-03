import { Play, Pause, SkipForward, RotateCcw, Square } from 'lucide-react'
import { Button } from './ui'
import { useAppStore } from '../store'

export const ExecutionControls = () => {
	const {
		isRunning,
		isPaused,
		currentStep,
		steps,
		play,
		pause,
		step,
		reset,
		restart,
	} = useAppStore()

	const hasSteps = steps.length > 0
	const hasStarted = currentStep > 0
	const isComplete = hasSteps && currentStep >= steps.length

	return (
		<div className="execution-controls">
			<div className="controls-buttons">
				{!isRunning ? (
					<Button
						onClick={play}
						size="sm"
						disabled={isComplete || !hasSteps}
						className="control-btn control-btn-play"
					>
						<Play size={16} />
						Play
					</Button>
				) : (
					<Button
						onClick={pause}
						size="sm"
						variant="secondary"
						className="control-btn control-btn-pause"
					>
						<Pause size={16} />
						Pause
					</Button>
				)}

				<Button
					onClick={step}
					size="sm"
					variant="outline"
					disabled={isComplete || !hasSteps}
					className="control-btn control-btn-step"
				>
					<SkipForward size={16} />
					Step
				</Button>

				<Button
					onClick={restart}
					size="sm"
					variant={isComplete ? 'primary' : 'outline'}
					className="control-btn control-btn-restart"
				>
					<RotateCcw size={16} />
					Restart
				</Button>

				<Button
					onClick={reset}
					size="sm"
					variant="outline"
					className="control-btn control-btn-reset"
				>
					<Square size={16} />
					Reset
				</Button>
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
				) : isRunning && !isPaused ? (
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
			</div>
		</div>
	)
}
