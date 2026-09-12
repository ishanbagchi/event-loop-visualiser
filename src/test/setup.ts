import '@testing-library/jest-dom'

Object.defineProperty(globalThis, 'ResizeObserver', {
	value: class ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	},
})

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => {},
	}),
})
