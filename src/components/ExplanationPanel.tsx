import { useAppStore } from '../store'
import { Badge } from './ui'

export const ExplanationPanel = () => {
	const { steps, currentStep } = useAppStore()

	const currentStepData = steps[currentStep - 1]

	return (
		<div className="panel explanation-panel">
			<div className="panel-header">
				<h3>Explanation</h3>
				<p>What's happening right now</p>
			</div>
			<div className="panel-content">
				{!currentStepData ? (
					<div className="panel-empty">
						<div className="panel-empty-content">
							<div className="panel-empty-icon">💡</div>
							<p>Ready to start</p>
							<p className="small">
								Click Play or Step to begin execution
							</p>
						</div>
					</div>
				) : (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '0.75rem',
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem',
							}}
						>
							<Badge variant="default">Step {currentStep}</Badge>
							{currentStepData.lineNumber && (
								<Badge variant="default">
									Line {currentStepData.lineNumber}
								</Badge>
							)}
						</div>
						<p style={{ fontSize: '0.875rem', color: '#374151' }}>
							{currentStepData.description}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
