import { useAppStore } from '../store'
import { Badge } from './ui'

export const ExplanationPanel = () => {
	const { steps, currentStep } = useAppStore()

	const currentStepData = steps[currentStep - 1]

	return (
		<div className="panel explanation-panel">
			<div className="panel-header">
				<h3>Explanation</h3>
			</div>
			<div className="panel-content explanation-content">
				{!currentStepData ? (
					<div className="panel-empty">
						<div className="panel-empty-content">
							<p
								style={{
									margin: 0,
									color: '#6b7280',
									fontSize: '0.875rem',
								}}
							>
								Click Play or Step to begin execution and see
								detailed explanations
							</p>
						</div>
					</div>
				) : (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.75rem',
							height: '100%',
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.4rem',
								flexShrink: 0,
							}}
						>
							<Badge
								variant="default"
								style={{
									fontSize: '0.75rem',
									padding: '0.1rem 0.4rem',
								}}
							>
								Step {currentStep}
							</Badge>
							{currentStepData.lineNumber && (
								<Badge
									variant="default"
									style={{
										fontSize: '0.75rem',
										padding: '0.1rem 0.4rem',
									}}
								>
									Line {currentStepData.lineNumber}
								</Badge>
							)}
						</div>
						<p
							style={{
								fontSize: '0.875rem',
								color: '#374151',
								margin: 0,
								lineHeight: 1.4,
								flex: 1,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{currentStepData.description}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
