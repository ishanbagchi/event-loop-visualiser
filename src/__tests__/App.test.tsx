import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App Component', () => {
	it('should render main sections', () => {
		render(<App />)

		expect(
			screen.getByRole('heading', { level: 1 }),
		).toBeInTheDocument()
		expect(
			screen.getByText(/stack, Web APIs,/),
		).toBeInTheDocument()

		expect(screen.getByText('Call Stack')).toBeInTheDocument()
		expect(screen.getByText('Web APIs')).toBeInTheDocument()
		expect(screen.getByText('Callback Queue')).toBeInTheDocument()
		expect(screen.getByText('Console Output')).toBeInTheDocument()

		expect(
			screen.getByText(
				/Built with ❤️ to help developers understand JavaScript internals/,
			),
		).toBeInTheDocument()
		expect(screen.getByText('📚 Event Loop Guide')).toBeInTheDocument()
	})

	it('should have execution controls', () => {
		render(<App />)

		const buttons = screen.getAllByRole('button')
		expect(buttons.length).toBeGreaterThan(0)
	})

	it('should render the source panel with the active sample code', () => {
		const { container } = render(<App />)

		expect(screen.getByText(/Source/)).toBeInTheDocument()
		expect(
			container.querySelector('.code-editor-content')?.textContent,
		).toContain('console.log')
	})

	it('should have proper layout structure', () => {
		render(<App />)

		const header = screen.getByRole('banner')
		const main = screen.getByRole('main')
		const footer = screen.getByRole('contentinfo')

		expect(header).toBeInTheDocument()
		expect(main).toBeInTheDocument()
		expect(footer).toBeInTheDocument()
	})

	it('should render sample selector', () => {
		render(<App />)

		expect(screen.getByText('Load a specimen')).toBeInTheDocument()
	})

	it('should have responsive layout classes', () => {
		const { container } = render(<App />)

		const appDiv = container.querySelector('.app')
		expect(appDiv).toBeInTheDocument()

		const mainGrid = container.querySelector('.main-grid')
		expect(mainGrid).toBeInTheDocument()

		const visualizationGrid = container.querySelector('.visualization-grid')
		expect(visualizationGrid).toBeInTheDocument()
	})
})
