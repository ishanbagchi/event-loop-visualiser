import { useAppStore } from '../store'
import { Badge } from './ui'
import { useEffect, useRef } from 'react'

export const CallStack = () => {
	const { callStack } = useAppStore()
	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (contentRef.current && callStack.length > 0) {
			contentRef.current.scrollTop = contentRef.current.scrollHeight
		}
	}, [callStack.length])

	return (
		<div className="panel call-stack">
			<div className="panel-header">
				<h3>Call Stack</h3>
			</div>
			<div className="panel-content" ref={contentRef}>
				{callStack.length === 0 ? (
					<div className="panel-empty">
						<div className="panel-empty-content">
							<div className="panel-empty-icon">📚</div>
							<p>Call stack is empty</p>
							<p className="small">
								Functions will appear here when called
							</p>
						</div>
					</div>
				) : (
					<div>
						{callStack.map((item, index) => (
							<div
								key={item.id}
								className={`stack-item ${
									index === callStack.length - 1
										? 'active'
										: ''
								}`}
							>
								<div className="item-header">
									<span className="item-name">
										{item.name}
									</span>
									{index === callStack.length - 1 && (
										<Badge variant="default">
											Executing
										</Badge>
									)}
								</div>
								{item.lineNumber && (
									<div className="item-details">
										Line {item.lineNumber}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
