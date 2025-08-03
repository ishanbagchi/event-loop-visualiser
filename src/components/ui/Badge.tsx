import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	variant?: 'default' | 'success' | 'warning' | 'error'
}

export const Badge = ({
	className = '',
	variant = 'default',
	...props
}: BadgeProps) => {
	const classes = `badge badge-${variant} ${className}`

	return <span className={classes} {...props} />
}
