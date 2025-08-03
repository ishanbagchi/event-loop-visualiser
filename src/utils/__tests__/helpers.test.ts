import { describe, it, expect } from 'vitest'

// Test utility functions that might be added later
describe('Utility Functions', () => {
	describe('ID Generation', () => {
		it('should generate unique IDs', () => {
			const generateId = (prefix: string = 'id') =>
				`${prefix}-${Date.now()}-${Math.random()}`

			const id1 = generateId()
			const id2 = generateId()

			expect(id1).not.toBe(id2)
			expect(typeof id1).toBe('string')
			expect(typeof id2).toBe('string')
		})
	})

	describe('Code Parsing Helpers', () => {
		it('should identify function calls correctly', () => {
			const isFunctionCall = (line: string) => {
				return line.includes('(') && line.includes(')')
			}

			expect(isFunctionCall('console.log("test")')).toBe(true)
			expect(isFunctionCall('setTimeout(() => {}, 1000)')).toBe(true)
			expect(isFunctionCall('let x = 5')).toBe(false)
			expect(isFunctionCall('// comment')).toBe(false)
		})

		it('should extract function names', () => {
			const extractFunctionName = (line: string) => {
				// For console.log, we want to extract 'console'
				const match =
					line.match(/^(\w+)\.?\w*\s*\(/) || line.match(/(\w+)\s*\(/)
				return match ? match[1] : null
			}

			expect(extractFunctionName('console.log("test")')).toBe('console')
			expect(extractFunctionName('setTimeout(() => {}, 1000)')).toBe(
				'setTimeout',
			)
			expect(extractFunctionName('myFunction()')).toBe('myFunction')
			expect(extractFunctionName('let x = 5')).toBe(null)
		})
	})

	describe('Time Formatting', () => {
		it('should format timestamps correctly', () => {
			const formatTime = (timestamp: number) => {
				return new Date(timestamp).toLocaleTimeString()
			}

			const now = Date.now()
			const formatted = formatTime(now)

			expect(typeof formatted).toBe('string')
			expect(formatted).toMatch(/\d+:\d+:\d+/)
		})

		it('should handle relative time', () => {
			const getRelativeTime = (timestamp: number) => {
				const diff = Date.now() - timestamp
				if (diff < 1000) return 'just now'
				if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
				return 'some time ago'
			}

			const now = Date.now()
			expect(getRelativeTime(now)).toBe('just now')
			expect(getRelativeTime(now - 5000)).toBe('5s ago')
			expect(getRelativeTime(now - 120000)).toBe('some time ago')
		})
	})

	describe('Array Helpers', () => {
		it('should handle queue operations', () => {
			const queue: string[] = []

			// Enqueue
			queue.push('first')
			queue.push('second')
			expect(queue).toHaveLength(2)

			// Dequeue
			const first = queue.shift()
			expect(first).toBe('first')
			expect(queue).toHaveLength(1)

			// Peek
			expect(queue[0]).toBe('second')
			expect(queue).toHaveLength(1)
		})

		it('should handle stack operations', () => {
			const stack: string[] = []

			// Push
			stack.push('first')
			stack.push('second')
			expect(stack).toHaveLength(2)

			// Pop
			const top = stack.pop()
			expect(top).toBe('second')
			expect(stack).toHaveLength(1)

			// Peek
			expect(stack[stack.length - 1]).toBe('first')
			expect(stack).toHaveLength(1)
		})
	})
})
