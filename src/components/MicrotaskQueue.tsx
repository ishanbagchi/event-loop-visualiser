import { useAppStore } from '../store'
import { PaneShell } from './PaneShell'

export const MicrotaskQueue = () => {
	const callbackQueue = useAppStore((state) => state.callbackQueue)
	const microtasks = callbackQueue.filter((item) => item.type === 'promise')

	return (
		<PaneShell
			className="microtask-queue"
			title="Microtask Queue"
			note="Promises and await. Drained fully, first."
			color="var(--color-promise)"
			count={microtasks.length}
		>
			{microtasks.length === 0 ? (
				<div className="pane-empty">
					<p>Microtask queue is empty</p>
					<p className="small">
						Promise callbacks will queue here
					</p>
				</div>
			) : (
				microtasks.map((item) => (
					<div key={item.id} className="microtask-item">
						<div className="item-name">{item.name}</div>
						{item.lineNumber && (
							<div className="item-details">
								Line {item.lineNumber}
							</div>
						)}
					</div>
				))
			)}
		</PaneShell>
	)
}
