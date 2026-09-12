import { useAppStore } from '../store'
import { PaneShell } from './PaneShell'

export const CallStack = () => {
	const callStack = useAppStore((state) => state.callStack)
	const frames = callStack.slice().reverse()

	return (
		<PaneShell
			className="call-stack"
			title="Call Stack"
			note="What's executing right now, most recent on top"
			color="var(--color-text)"
			count={frames.length}
		>
			{frames.length === 0 ? (
				<div className="pane-empty">
					<p>Call stack is empty</p>
					<p className="small">
						Functions will appear here when called
					</p>
				</div>
			) : (
				frames.map((item) => (
					<div key={item.id} className="stack-item">
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
