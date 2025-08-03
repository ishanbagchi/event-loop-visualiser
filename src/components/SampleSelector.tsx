import { useAppStore } from '../store'

export const SampleSelector = () => {
	const { samples, currentSample, loadSample } = useAppStore()

	return (
		<div className="sample-selector">
			<div className="sample-selector-header">
				<h3>Sample Code</h3>
			</div>
			<div className="sample-selector-content">
				<select
					value={currentSample?.id || ''}
					onChange={(e) => {
						const sample = samples.find(
							(s) => s.id === e.target.value,
						)
						if (sample) loadSample(sample)
					}}
					className="sample-dropdown"
				>
					{samples.map((sample) => (
						<option key={sample.id} value={sample.id}>
							{sample.title} - {sample.description}
						</option>
					))}
				</select>
			</div>
		</div>
	)
}
