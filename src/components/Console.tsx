import { useAppStore } from '../store'
import type { ConsoleLog } from '../types'

const fromTone = (from: ConsoleLog['from']) => {
	if (from === 'microtask queue') return 'var(--color-well-promise)'
	if (from === 'callback queue') return 'var(--color-well-stack)'
	return 'var(--color-well-text-faint)'
}

export const Console = () => {
	const consoleLogs = useAppStore((state) => state.consoleLogs)

	return (
		<div className="console-panel">
			<div className="console-header">
				<h3>Console Output</h3>
				<span className="console-order-label">In execution order</span>
			</div>
			<div className="console-content">
				{!consoleLogs || consoleLogs.length === 0 ? (
					<div className="console-empty">
						Console output will appear here...
					</div>
				) : (
					<div>
						{consoleLogs.map((log: ConsoleLog, index) => (
							<div key={log.id} className="console-row">
								<span className="console-row-index">
									{String(index + 1).padStart(2, '0')}
								</span>
								<span
									className={`console-log ${log.type}`}
								>
									{log.message}
								</span>
								{log.from && (
									<span
										className="console-row-from"
										style={{ color: fromTone(log.from) }}
									>
										{log.from}
									</span>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
