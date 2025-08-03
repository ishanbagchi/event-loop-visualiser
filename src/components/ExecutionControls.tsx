import { Play, Pause, SkipForward, RotateCcw, Square } from 'lucide-react'
import { Button } from './ui'
import { useAppStore } from '../store'

export const ExecutionControls = () => {
	const { isRunning, isPaused, play, pause, step, reset, restart } =
		useAppStore()

	return (
		<div className="execution-controls">
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.25rem',
				}}
			>
				{!isRunning ? (
					<Button
						onClick={play}
						size="sm"
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.25rem',
						}}
					>
						<Play size={16} />
						Play
					</Button>
				) : (
					<Button
						onClick={pause}
						size="sm"
						variant="secondary"
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.25rem',
						}}
					>
						<Pause size={16} />
						Pause
					</Button>
				)}

				<Button
					onClick={step}
					size="sm"
					variant="outline"
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.25rem',
					}}
				>
					<SkipForward size={16} />
					Step
				</Button>

				<Button
					onClick={restart}
					size="sm"
					variant="outline"
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.25rem',
					}}
				>
					<RotateCcw size={16} />
					Restart
				</Button>

				<Button
					onClick={reset}
					size="sm"
					variant="outline"
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.25rem',
					}}
				>
					<Square size={16} />
					Reset
				</Button>
			</div>

			<div className="status">
				{isRunning && !isPaused && (
					<>
						<div className="status-indicator running"></div>
						Running
					</>
				)}
				{isPaused && (
					<>
						<div className="status-indicator paused"></div>
						Paused
					</>
				)}
			</div>
		</div>
	)
}
