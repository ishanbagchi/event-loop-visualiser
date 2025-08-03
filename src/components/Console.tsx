import { useAppStore } from '../store'
import type { ConsoleLog } from '../types'

export const Console = () => {
	const { consoleLogs } = useAppStore()

	return (
		<div className="console-panel">
			<div className="console-header">
				<h3>Console Output</h3>
				<div className="console-dots">
					<div className="console-dot red"></div>
					<div className="console-dot yellow"></div>
					<div className="console-dot green"></div>
				</div>
			</div>
			<div className="console-content">
				{!consoleLogs || consoleLogs.length === 0 ? (
					<div className="console-empty">
						Console output will appear here...
					</div>
				) : (
					<div>
						{consoleLogs.map((log: ConsoleLog) => (
							<div
								key={log.id}
								className={`console-log ${log.type}`}
							>
								<span className="console-timestamp">
									{new Date(
										log.timestamp,
									).toLocaleTimeString()}
								</span>
								{log.message}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
