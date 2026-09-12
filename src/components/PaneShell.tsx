import type { ReactNode } from 'react'

interface PaneShellProps {
	className: string
	title: string
	note: string
	color: string
	count: number
	children: ReactNode
}

export const PaneShell = ({
	className,
	title,
	note,
	color,
	count,
	children,
}: PaneShellProps) => {
	const ruleColor = count > 0 ? color : 'rgba(243, 242, 242, 0.35)'

	return (
		<div className={`event-pane ${className}`}>
			<div className="pane-header">
				<span className="pane-dot" style={{ background: color }} />
				<h3 style={{ color }}>{title}</h3>
				{count > 0 && <span className="pane-count">{count}</span>}
			</div>
			<div className="pane-rule" style={{ background: ruleColor }} />
			<p className="pane-note">{note}</p>
			<div className="pane-content">{children}</div>
		</div>
	)
}
