import { useAppStore } from '../store'
import { Badge } from './ui'

export const WebAPIs = () => {
	const { webAPIs } = useAppStore()

	const getTypeBadge = (type: string) => {
		switch (type) {
			case 'setTimeout':
				return <Badge variant="warning">Timer</Badge>
			case 'setInterval':
				return <Badge variant="warning">Interval</Badge>
			case 'DOM':
				return <Badge variant="default">DOM</Badge>
			case 'XHR':
				return <Badge variant="error">XHR</Badge>
			default:
				return <Badge variant="default">API</Badge>
		}
	}

	return (
		<div className="panel web-apis">
			<div className="panel-header">
				<h3>Web APIs</h3>
			</div>
			<div className="panel-content">
				{webAPIs.length === 0 ? (
					<div className="panel-empty">
						<div className="panel-empty-content">
							<div className="panel-empty-icon">🌐</div>
							<p>No active Web APIs</p>
							<p className="small">
								setTimeout, DOM events, etc. will appear here
							</p>
						</div>
					</div>
				) : (
					<div>
						{webAPIs.map((item) => (
							<div
								key={item.id}
								className={`api-item ${item.type}`}
							>
								<div className="item-header">
									<span className="item-name">
										{item.name}
									</span>
									{getTypeBadge(item.type)}
								</div>
								<div className="item-details">
									{item.timeRemaining !== undefined && (
										<span>
											Time remaining: {item.timeRemaining}
											ms
										</span>
									)}
									{item.lineNumber && (
										<span
											className={
												item.timeRemaining !== undefined
													? ' • '
													: ''
											}
										>
											Line {item.lineNumber}
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
