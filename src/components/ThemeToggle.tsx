import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../theme/useTheme'
import { THEMES, type ThemeMode } from '../theme/themes'
import './ThemeToggle.css'

const OPTIONS: { mode: ThemeMode; label: string }[] = [
	{ mode: 'system', label: 'Match system' },
	...THEMES.map((theme) => ({ mode: theme.id as ThemeMode, label: theme.label })),
]

export function ThemeToggle() {
	const { mode, setMode, resolved } = useTheme()
	const [open, setOpen] = useState(false)
	const rootRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return

		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false)
			}
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false)
		}
		document.addEventListener('pointerdown', onPointerDown)
		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('pointerdown', onPointerDown)
			document.removeEventListener('keydown', onKeyDown)
		}
	}, [open])

	const activeLabel =
		OPTIONS.find((option) => option.mode === mode)?.label ?? resolved

	return (
		<div className="theme-toggle" ref={rootRef}>
			<button
				type="button"
				className="theme-toggle-trigger"
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
			>
				<span
					className="theme-toggle-dot"
					data-resolved={resolved}
					aria-hidden="true"
				/>
				<span>{activeLabel}</span>
			</button>

			{open && (
				<ul className="theme-toggle-menu" role="listbox">
					{OPTIONS.map((option) => (
						<li key={option.mode}>
							<button
								type="button"
								role="option"
								aria-selected={option.mode === mode}
								className={`theme-toggle-option${
									option.mode === mode ? ' active' : ''
								}`}
								onClick={() => {
									setMode(option.mode)
									setOpen(false)
								}}
							>
								{option.label}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
