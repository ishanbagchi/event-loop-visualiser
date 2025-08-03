import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

// Mock Monaco Editor to avoid issues in tests
vi.mock('@monaco-editor/react', () => ({
	Editor: vi.fn(() => (
		<div data-testid="monaco-editor">Monaco Editor Mock</div>
	)),
}))

describe('App Component', () => {
	it('should render main sections', () => {
		render(<App />)

		// Header
		expect(
			screen.getByText('JavaScript Event Loop Visualizer'),
		).toBeInTheDocument()
		expect(
			screen.getByText(/Understand how the JavaScript event loop works/),
		).toBeInTheDocument()

		// Main components should be present
		expect(screen.getByText('Call Stack')).toBeInTheDocument()
		expect(screen.getByText('Web APIs')).toBeInTheDocument()
		expect(screen.getByText('Callback Queue')).toBeInTheDocument()
		expect(screen.getByText('Console Output')).toBeInTheDocument()

		// Footer
		expect(
			screen.getByText(
				/Built with ❤️ to help developers understand JavaScript internals/,
			),
		).toBeInTheDocument()
		expect(screen.getByText('📚 Event Loop Guide')).toBeInTheDocument()
	})

	it('should have execution controls', () => {
		render(<App />)

		// Check for control buttons (they might be icons or text)
		const buttons = screen.getAllByRole('button')
		expect(buttons.length).toBeGreaterThan(0)
	})

	it('should render code editor', () => {
		render(<App />)

		// Check if Monaco editor mock is rendered
		expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
	})

	it('should have proper layout structure', () => {
		render(<App />)

		// Check for main layout elements
		const header = screen.getByRole('banner')
		const main = screen.getByRole('main')
		const footer = screen.getByRole('contentinfo')

		expect(header).toBeInTheDocument()
		expect(main).toBeInTheDocument()
		expect(footer).toBeInTheDocument()
	})

	it('should render sample selector', () => {
		render(<App />)

		// Sample selector should be present (might be a dropdown or select)
		const sampleElements =
			screen.queryByText(/sample/i) || screen.queryByRole('combobox')
		expect(sampleElements).toBeTruthy()
	})

	it('should have responsive layout classes', () => {
		const { container } = render(<App />)

		// Check if main container has expected classes
		const appDiv = container.querySelector('.app')
		expect(appDiv).toBeInTheDocument()

		const mainGrid = container.querySelector('.main-grid')
		expect(mainGrid).toBeInTheDocument()

		const visualizationGrid = container.querySelector('.visualization-grid')
		expect(visualizationGrid).toBeInTheDocument()
	})
})
