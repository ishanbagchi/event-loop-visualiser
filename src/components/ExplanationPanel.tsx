import { useAppStore } from '../store'
import { useShallow } from 'zustand/react/shallow'
import type { ExecutionStep } from '../types'

const phaseLabel = (type: ExecutionStep['type']): string => {
	switch (type) {
		case 'web-api':
			return 'Hand-off'
		case 'callback-queue':
			return 'Queued'
		case 'error':
			return 'Error'
		default:
			return 'Synchronous'
	}
}

export const ExplanationPanel = () => {
	const { steps, currentStep } = useAppStore(
		useShallow((state) => ({
			steps: state.steps,
			currentStep: state.currentStep,
		})),
	)

	const currentStepData = steps[currentStep - 1]

	return (
		<div className="explanation-panel">
			{!currentStepData ? (
				<>
					<div className="explanation-phase">Ready</div>
					<p className="explanation-text muted">
						Click Play or Step to begin execution and see
						detailed explanations here.
					</p>
				</>
			) : (
				<>
					<div className="explanation-phase">
						{phaseLabel(currentStepData.type)}
					</div>
					<p
						key={`${currentStep}-${steps.length}`}
						className="explanation-text"
					>
						{currentStepData.description}
					</p>
				</>
			)}
		</div>
	)
}
