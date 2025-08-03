import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'outline'
	size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
		const classes = `btn btn-${variant} btn-${size} ${className}`

		return <button ref={ref} className={classes} {...props} />
	},
)

Button.displayName = 'Button'
