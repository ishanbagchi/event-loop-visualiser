import { useMemo } from 'react'
import { useAppStore } from '../store'
import { useShallow } from 'zustand/react/shallow'
import type { CodeSample } from '../types'
import { Dropdown, type DropdownGroup } from './ui'

const CATEGORY_LABELS: Record<CodeSample['category'], string> = {
	basic: 'Basic',
	timers: 'Timers',
	promises: 'Promises',
	loops: 'Loops',
	classes: 'Classes',
	events: 'Events',
	generators: 'Generators',
}

export const SampleSelector = () => {
	const { samples, currentSample, loadSample } = useAppStore(
		useShallow((state) => ({
			samples: state.samples,
			currentSample: state.currentSample,
			loadSample: state.loadSample,
		})),
	)

	const groups = useMemo<DropdownGroup[]>(() => {
		const categories = Array.from(new Set(samples.map((s) => s.category)))
		return categories.map((category) => ({
			label: CATEGORY_LABELS[category],
			options: samples
				.filter((s) => s.category === category)
				.map((s) => ({ value: s.id, label: s.title })),
		}))
	}, [samples])

	const handleChange = (id: string) => {
		const sample = samples.find((s) => s.id === id)
		if (sample) loadSample(sample)
	}

	return (
		<div className="sample-selector">
			<div className="sample-selector-header">
				<h3>Load a specimen</h3>
			</div>
			<div className="sample-selector-content">
				<Dropdown
					value={currentSample?.id ?? ''}
					onChange={handleChange}
					groups={groups}
					ariaLabel="Load a specimen"
					placeholder="Choose a specimen…"
				/>
				{currentSample && (
					<p className="sample-select-description">
						{currentSample.description}
					</p>
				)}
			</div>
		</div>
	)
}
