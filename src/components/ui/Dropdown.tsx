import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './Dropdown.css'

export interface DropdownOption {
	value: string
	label: string
}

export interface DropdownGroup {
	label: string
	options: DropdownOption[]
}

interface DropdownProps {
	value: string
	onChange: (value: string) => void
	groups: DropdownGroup[]
	ariaLabel: string
	className?: string
	placeholder?: string
}

export function Dropdown({
	value,
	onChange,
	groups,
	ariaLabel,
	className = '',
	placeholder = 'Select…',
}: DropdownProps) {
	const [open, setOpen] = useState(false)
	const rootRef = useRef<HTMLDivElement>(null)

	const flatOptions = groups.flatMap((group) => group.options)
	const selected = flatOptions.find((option) => option.value === value)

	useEffect(() => {
		if (!open) return

		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
		}
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false)
		}
		document.addEventListener('pointerdown', onPointerDown)
		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('pointerdown', onPointerDown)
			document.removeEventListener('keydown', onKeyDown)
		}
	}, [open])

	const moveSelection = (delta: number) => {
		if (flatOptions.length === 0) return
		const currentIndex = flatOptions.findIndex((option) => option.value === value)
		const nextIndex =
			(currentIndex + delta + flatOptions.length) % flatOptions.length
		onChange(flatOptions[nextIndex].value)
	}

	const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault()
			if (!open) setOpen(true)
			else moveSelection(1)
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			if (!open) setOpen(true)
			else moveSelection(-1)
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			setOpen((v) => !v)
		}
	}

	return (
		<div className={`dropdown ${className}`} ref={rootRef}>
			<button
				type="button"
				className="dropdown-trigger"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={ariaLabel}
				onClick={() => setOpen((v) => !v)}
				onKeyDown={handleTriggerKeyDown}
			>
				<span className="dropdown-trigger-label">
					{selected?.label ?? placeholder}
				</span>
				<span className="dropdown-caret" aria-hidden="true" />
			</button>

			{open && (
				<ul className="dropdown-menu" role="listbox" aria-label={ariaLabel}>
					{groups.map((group) => (
						<li key={group.label} className="dropdown-group" role="group">
							<span className="dropdown-group-label" aria-hidden="true">
								{group.label}
							</span>
							{group.options.map((option) => (
								<button
									key={option.value}
									type="button"
									role="option"
									aria-selected={option.value === value}
									className={`dropdown-option${
										option.value === value ? ' active' : ''
									}`}
									onClick={() => {
										onChange(option.value)
										setOpen(false)
									}}
								>
									{option.label}
								</button>
							))}
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
