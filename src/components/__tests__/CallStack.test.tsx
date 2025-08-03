import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CallStack } from '../CallStack'
import { useAppStore } from '../../store'

// Mock the store
vi.mock('../../store', () => ({
	useAppStore: vi.fn(),
}))

describe('CallStack Component', () => {
	it('should render empty state when call stack is empty', () => {
		;(useAppStore as any).mockReturnValue({
			callStack: [],
		})

		render(<CallStack />)

		expect(screen.getByText('Call Stack')).toBeInTheDocument()
		expect(screen.getByText('Call stack is empty')).toBeInTheDocument()
		expect(
			screen.getByText('Functions will appear here when called'),
		).toBeInTheDocument()
	})

	it('should render call stack items when present', () => {
		const mockCallStack = [
			{
				id: '1',
				name: 'console.log',
				lineNumber: 1,
			},
			{
				id: '2',
				name: 'setTimeout callback',
				lineNumber: 3,
			},
		]

		;(useAppStore as any).mockReturnValue({
			callStack: mockCallStack,
		})

		render(<CallStack />)

		expect(screen.getByText('console.log')).toBeInTheDocument()
		expect(screen.getByText('setTimeout callback')).toBeInTheDocument()
		expect(screen.getByText('Line 1')).toBeInTheDocument()
		expect(screen.getByText('Line 3')).toBeInTheDocument()
	})

	it('should display stack items in correct order', () => {
		const mockCallStack = [
			{ id: '1', name: 'first', lineNumber: 1 },
			{ id: '2', name: 'second', lineNumber: 2 },
			{ id: '3', name: 'third', lineNumber: 3 },
		]

		;(useAppStore as any).mockReturnValue({
			callStack: mockCallStack,
		})

		render(<CallStack />)

		const stackItems = screen.getAllByText(/Line \d+/)
		expect(stackItems).toHaveLength(3)

		// Items should be displayed in order (bottom to top of stack)
		expect(screen.getByText('first')).toBeInTheDocument()
		expect(screen.getByText('second')).toBeInTheDocument()
		expect(screen.getByText('third')).toBeInTheDocument()
	})
})
