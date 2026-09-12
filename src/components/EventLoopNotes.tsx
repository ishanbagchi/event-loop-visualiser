export const EventLoopNotes = () => {
	return (
		<div className="event-loop-notes">
			<div>
				<div className="event-loop-notes-label">The rule</div>
				<p>
					A queue is only consulted when the call stack is{' '}
					<em>completely</em> empty. Synchronous code always
					finishes first.
				</p>
			</div>
			<div>
				<div className="event-loop-notes-label">Priority</div>
				<p>
					Microtasks — promises, <code>await</code>,
					queueMicrotask — drain <em>entirely</em> before one
					macrotask runs.
				</p>
			</div>
		</div>
	)
}
