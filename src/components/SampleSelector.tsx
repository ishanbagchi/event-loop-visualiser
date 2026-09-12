import { useAppStore } from '../store'
import { useShallow } from 'zustand/react/shallow'

export const SampleSelector = () => {
	const { samples, currentSample, loadSample } = useAppStore(
		useShallow((state) => ({
			samples: state.samples,
			currentSample: state.currentSample,
			loadSample: state.loadSample,
		})),
	)

	return (
		<div className="sample-selector">
			<div className="sample-selector-header">
				<h3>Load a specimen</h3>
			</div>
			<div className="sample-selector-content">
				<div className="sample-pills">
					{samples.map((sample) => (
						<button
							key={sample.id}
							type="button"
							onClick={() => loadSample(sample)}
							title={sample.description}
							className={`sample-pill${
								sample.id === currentSample?.id
									? ' active'
									: ''
							}`}
						>
							{sample.title}
						</button>
					))}
				</div>
			</div>
		</div>
	)
}
