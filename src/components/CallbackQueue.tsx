import { useAppStore } from '../store'
import { Badge } from './ui'

export const CallbackQueue = () => {
	const { callbackQueue } = useAppStore()

	const getTypeBadge = (type: string) => {
		switch (type) {
			case 'timeout':
				return <Badge variant="warning">Timeout</Badge>
			case 'interval':
				return <Badge variant="warning">Interval</Badge>
			case 'event':
				return <Badge variant="success">Event</Badge>
			case 'promise':
				return <Badge variant="success">Promise</Badge>
			default:
				return <Badge variant="default">Other</Badge>
		}
	}

	return (
		<div className="panel callback-queue">
			<div className="panel-header">
				<h3>Callback Queue</h3>
			</div>
			<div className="panel-content">
				{callbackQueue.length === 0 ? (
					<div className="panel-empty">
						<div className="panel-empty-content">
							<div className="panel-empty-icon">📋</div>
							<p>Callback queue is empty</p>
							<p className="small">
								Callbacks will queue here after Web APIs
							</p>
						</div>
					</div>
				) : (
					<div>
						{callbackQueue.map((item, index) => (
							<div
								key={item.id}
								className={`queue-item ${item.type}`}
							>
								<div className="item-header">
									<span className="item-name">
										{item.name}
									</span>
									{getTypeBadge(item.type)}
								</div>
								<div className="item-details">
									Position in queue: {index + 1}
									{item.lineNumber &&
										` • Line ${item.lineNumber}`}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
