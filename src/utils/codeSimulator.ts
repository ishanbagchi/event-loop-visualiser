import type {
	ExecutionStep,
	CallStackItem,
	CallbackQueueItem,
	WebAPIItem,
} from '../types'

export class CodeExecutionSimulator {
	private steps: ExecutionStep[] = []
	private callStack: CallStackItem[] = []
	private callbackQueue: CallbackQueueItem[] = []
	private webAPIs: WebAPIItem[] = []
	private stepId = 0

	private generateId(): string {
		return `step-${++this.stepId}`
	}

	simulateCode(code: string): ExecutionStep[] {
		this.steps = []
		this.callStack = []
		this.callbackQueue = []
		this.webAPIs = []
		this.stepId = 0

		// Parse all lines first to understand the full execution flow
		const lines = code.split('\n')
		const pendingCallbacks: Array<{
			callback: CallbackQueueItem
			delay: number
		}> = []

		// First, join multiline constructs like setTimeout
		const processedCode = code.replace(/\s+/g, ' ').replace(/\n/g, ' ')

		// Pre-identify setTimeout blocks to avoid processing their content as synchronous code
		const setTimeoutBlocks = this.identifySetTimeoutBlocks(lines)
		// Pre-identify Promise blocks to avoid processing their .then() content as synchronous code
		const promiseBlocks = this.identifyAllPromiseBlocks(lines)

		// First pass: Process all synchronous code (skip setTimeout and Promise callback content)
		lines.forEach((line, index) => {
			const lineNumber = index + 1
			const trimmedLine = line.trim()

			if (!trimmedLine) return

			// Skip lines that are inside setTimeout callbacks
			if (
				setTimeoutBlocks.some(
					(block: {
						startLine: number
						endLine: number
						callbackStartLine: number
					}) =>
						lineNumber > block.startLine &&
						lineNumber < block.endLine,
				)
			) {
				return
			}

			// Skip lines that are inside Promise .then() callbacks
			if (
				promiseBlocks.some(
					(block: {
						startLine: number
						endLine: number
						callbackStartLine: number
					}) =>
						lineNumber > block.startLine &&
						lineNumber < block.endLine,
				)
			) {
				return
			}

			if (trimmedLine.includes('setTimeout')) {
				// setTimeout is synchronous - it just registers the timer
				// Use the processed code to extract timeout delay properly
				const delayMatch = processedCode.match(/},\s*(\d+)\s*\)/)
				const delay = delayMatch ? parseInt(delayMatch[1]) : 0

				// Step 1: setTimeout() called - goes to call stack
				this.steps.push({
					id: this.generateId(),
					type: 'function-call',
					description: `setTimeout() called - added to call stack`,
					lineNumber, // This should highlight the setTimeout line
					state: {
						callStack: [
							...this.callStack,
							{
								id: this.generateId(),
								name: 'setTimeout',
								lineNumber,
							},
						],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Step 2: Timer registered with Web APIs
				const webApiItem: WebAPIItem = {
					id: this.generateId(),
					name: `setTimeout(${delay}ms)`,
					type: 'setTimeout',
					timeRemaining: delay,
					lineNumber,
				}
				this.webAPIs.push(webApiItem)

				this.steps.push({
					id: this.generateId(),
					type: 'web-api',
					description: `Timer registered with Web APIs for ${delay}ms`,
					lineNumber, // Still on the setTimeout line
					state: {
						callStack: [
							...this.callStack,
							{
								id: this.generateId(),
								name: 'setTimeout',
								lineNumber,
							},
						],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Step 3: setTimeout() returns - removed from call stack
				this.steps.push({
					id: this.generateId(),
					type: 'function-return',
					description: `setTimeout() completed - removed from call stack`,
					lineNumber, // Still on the setTimeout line
					state: {
						callStack: [...this.callStack],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Store callback for later execution (this will execute after all sync code)
				const callbackItem: CallbackQueueItem = {
					id: this.generateId(),
					name: 'setTimeout callback',
					type: 'timeout',
					delay,
					lineNumber: lineNumber, // Use the setTimeout line, not the callback line
				}
				pendingCallbacks.push({ callback: callbackItem, delay })
			} else if (trimmedLine.includes('Promise.resolve')) {
				// Handle Promise.resolve - resolves immediately and goes to microtask queue
				this.steps.push({
					id: this.generateId(),
					type: 'function-call',
					description:
						'Promise.resolve() called - added to call stack',
					lineNumber,
					state: {
						callStack: [
							...this.callStack,
							{
								id: this.generateId(),
								name: 'Promise.resolve',
								lineNumber,
							},
						],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Add Promise to Web APIs
				const webApiItem: WebAPIItem = {
					id: this.generateId(),
					name: 'Promise resolution',
					type: 'other',
					timeRemaining: 0,
					lineNumber,
				}
				this.webAPIs.push(webApiItem)

				this.steps.push({
					id: this.generateId(),
					type: 'web-api',
					description: 'Promise resolution registered with Web APIs',
					lineNumber,
					state: {
						callStack: [
							...this.callStack,
							{
								id: this.generateId(),
								name: 'Promise.resolve',
								lineNumber,
							},
						],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				this.steps.push({
					id: this.generateId(),
					type: 'function-return',
					description:
						'Promise.resolve() completed - removed from call stack',
					lineNumber,
					state: {
						callStack: [...this.callStack],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Find the .then() callback and schedule it for microtask queue
				const promiseBlock = this.identifyPromiseBlock(lines, index)
				if (promiseBlock) {
					const callbackItem: CallbackQueueItem = {
						id: this.generateId(),
						name: 'Promise.then callback',
						type: 'promise',
						delay: 0, // Promises execute before timeouts
						lineNumber: promiseBlock.startLine,
					}
					// Add to the beginning of pendingCallbacks (microtasks have priority)
					pendingCallbacks.unshift({
						callback: callbackItem,
						delay: 0,
					})
				}
			} else if (trimmedLine.includes('console.log')) {
				this.simulateConsoleLog(trimmedLine, lineNumber)
			} else if (trimmedLine.includes('setInterval')) {
				this.simulateSetInterval(trimmedLine, lineNumber)
			}
		})

		// Second pass: After all synchronous code, process callbacks
		// Sort by delay (shortest delay first)
		pendingCallbacks.sort((a, b) => a.delay - b.delay)

		pendingCallbacks.forEach(({ callback, delay }) => {
			if (callback.type === 'promise') {
				// Step 4: Promise resolves in Web APIs, callback moves to microtask queue
				this.webAPIs = this.webAPIs.filter(
					(item) => item.name !== 'Promise resolution',
				)
				this.callbackQueue.unshift(callback) // Microtasks go to front of queue

				this.steps.push({
					id: this.generateId(),
					type: 'callback-queue',
					description: `Promise resolved in Web APIs - callback moved to microtask queue`,
					lineNumber: callback.lineNumber,
					state: {
						callStack: [...this.callStack],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Step 5: Event loop picks up microtask - moves from microtask queue to call stack
				this.callbackQueue.shift() // Remove from queue
				this.callStack.push({
					id: callback.id,
					name: callback.name,
					lineNumber: callback.lineNumber,
				})

				this.steps.push({
					id: this.generateId(),
					type: 'function-call',
					description: `Event loop moved Promise.then callback from microtask queue to call stack`,
					lineNumber: callback.lineNumber,
					state: {
						callStack: [...this.callStack],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Step 6: Execute the Promise.then callback content
				if (
					callback.lineNumber &&
					callback.lineNumber <= lines.length
				) {
					const promiseBlock = this.identifyPromiseBlock(
						lines,
						callback.lineNumber - 1,
					)

					if (promiseBlock) {
						// Execute each line inside the .then callback
						for (
							let lineNum = promiseBlock.callbackStartLine;
							lineNum < promiseBlock.endLine;
							lineNum++
						) {
							const callbackLine = lines[lineNum - 1]
							if (
								callbackLine &&
								callbackLine.trim() &&
								!callbackLine.includes('.then(') &&
								!callbackLine.trim().startsWith('}')
							) {
								if (callbackLine.includes('console.log')) {
									// Extract the message from the callback's console.log
									const match = callbackLine.match(
										/console\.log\s*\(\s*([^)]+)\s*\)/,
									)
									let message = 'result'
									if (match) {
										const param = match[1].trim()
										// If it's a variable (like 'result'), use the actual promise value
										if (param === 'result') {
											message = 'Promise result'
										} else if (param.match(/^['"`]/)) {
											// If it's a string literal, extract it
											message = param.replace(/['"]/g, '')
										} else {
											// Otherwise use the parameter name
											message = param
										}
									}

									this.steps.push({
										id: this.generateId(),
										type: 'function-call',
										description: `console.log(${message}) called inside Promise.then`,
										lineNumber: lineNum,
										state: {
											callStack: [...this.callStack],
											callbackQueue: [
												...this.callbackQueue,
											],
											webAPIs: [...this.webAPIs],
										},
										consoleLogs: [
											{
												id: `log-${this.stepId}`,
												timestamp: Date.now(),
												message: message,
												type: 'log' as const,
											},
										],
									})

									this.steps.push({
										id: this.generateId(),
										type: 'function-return',
										description: `console.log executed - removed from call stack`,
										lineNumber: lineNum,
										state: {
											callStack: [...this.callStack],
											callbackQueue: [
												...this.callbackQueue,
											],
											webAPIs: [...this.webAPIs],
										},
									})
								} else {
									// Handle other statements inside the .then callback
									this.steps.push({
										id: this.generateId(),
										type: 'function-call',
										description: `Executing: ${callbackLine.trim()}`,
										lineNumber: lineNum,
										state: {
											callStack: [...this.callStack],
											callbackQueue: [
												...this.callbackQueue,
											],
											webAPIs: [...this.webAPIs],
										},
									})

									this.steps.push({
										id: this.generateId(),
										type: 'function-return',
										description: `Statement executed - removed from call stack`,
										lineNumber: lineNum,
										state: {
											callStack: [...this.callStack],
											callbackQueue: [
												...this.callbackQueue,
											],
											webAPIs: [...this.webAPIs],
										},
									})
								}
							}
						}
					}
				}

				// Step 7: Promise.then callback execution complete - remove from call stack
				this.callStack.pop()

				this.steps.push({
					id: this.generateId(),
					type: 'function-return',
					description: `Promise.then callback execution completed - removed from call stack`,
					lineNumber: callback.lineNumber,
					state: {
						callStack: [...this.callStack],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})
			} else {
				// Handle setTimeout callbacks (existing logic)
				// Step 4: Timer completes, callback moves from Web APIs to callback queue
				this.webAPIs = this.webAPIs.filter(
					(item) => item.name !== `setTimeout(${delay}ms)`,
				)
				this.callbackQueue.push(callback)

				this.steps.push({
					id: this.generateId(),
					type: 'callback-queue',
					description: `Timer completed (${delay}ms) - callback moved to callback queue`,
					lineNumber: callback.lineNumber,
					state: {
						callStack: [...this.callStack],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Step 5: Event loop picks up callback - moves from callback queue to call stack
				this.callbackQueue = this.callbackQueue.filter(
					(item) => item.id !== callback.id,
				)
				this.callStack.push({
					id: callback.id,
					name: callback.name,
					lineNumber: callback.lineNumber,
				})

				this.steps.push({
					id: this.generateId(),
					type: 'function-call',
					description: `Event loop moved setTimeout callback from queue to call stack`,
					lineNumber: callback.lineNumber,
					state: {
						callStack: [...this.callStack],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Step 6: Execute the callback content (statements inside the setTimeout)
				if (
					callback.lineNumber &&
					callback.lineNumber <= lines.length
				) {
					// Find the setTimeout block to get the inner statements
					const setTimeoutBlock = setTimeoutBlocks.find(
						(block) => block.startLine === callback.lineNumber,
					)

					if (setTimeoutBlock) {
						// Execute each line inside the callback
						for (
							let lineNum = setTimeoutBlock.callbackStartLine;
							lineNum < setTimeoutBlock.endLine;
							lineNum++
						) {
							const callbackLine = lines[lineNum - 1]
							if (
								callbackLine &&
								callbackLine.trim() &&
								!callbackLine.includes('setTimeout') &&
								!callbackLine.trim().startsWith('}')
							) {
								if (callbackLine.includes('console.log')) {
									// Extract the message from the callback's console.log
									const match = callbackLine.match(
										/console\.log\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/,
									)
									const message = match
										? match[1]
										: 'undefined'

									this.steps.push({
										id: this.generateId(),
										type: 'function-call',
										description: `console.log('${message}') called inside callback`,
										lineNumber: lineNum,
										state: {
											callStack: [...this.callStack],
											callbackQueue: [
												...this.callbackQueue,
											],
											webAPIs: [...this.webAPIs],
										},
										consoleLogs: [
											{
												id: `log-${this.stepId}`,
												timestamp: Date.now(),
												message,
												type: 'log' as const,
											},
										],
									})

									this.steps.push({
										id: this.generateId(),
										type: 'function-return',
										description: `console.log executed - removed from call stack`,
										lineNumber: lineNum,
										state: {
											callStack: [...this.callStack],
											callbackQueue: [
												...this.callbackQueue,
											],
											webAPIs: [...this.webAPIs],
										},
									})
								} else {
									// Handle other statements inside the callback
									this.steps.push({
										id: this.generateId(),
										type: 'function-call',
										description: `Executing: ${callbackLine.trim()}`,
										lineNumber: lineNum,
										state: {
											callStack: [...this.callStack],
											callbackQueue: [
												...this.callbackQueue,
											],
											webAPIs: [...this.webAPIs],
										},
									})

									this.steps.push({
										id: this.generateId(),
										type: 'function-return',
										description: `Statement executed - removed from call stack`,
										lineNumber: lineNum,
										state: {
											callStack: [...this.callStack],
											callbackQueue: [
												...this.callbackQueue,
											],
											webAPIs: [...this.webAPIs],
										},
									})
								}
							}
						}
					}
				}

				// Step 7: Callback execution complete - remove from call stack
				this.callStack.pop()

				this.steps.push({
					id: this.generateId(),
					type: 'function-return',
					description: `setTimeout callback execution completed - removed from call stack`,
					lineNumber: callback.lineNumber,
					state: {
						callStack: [...this.callStack],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})
			}
		})

		return this.steps
	}

	private identifySetTimeoutBlocks(lines: string[]): Array<{
		startLine: number
		endLine: number
		callbackStartLine: number
	}> {
		const blocks: Array<{
			startLine: number
			endLine: number
			callbackStartLine: number
		}> = []

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim()
			if (line.includes('setTimeout')) {
				const startLine = i + 1
				const endLine = this.findSetTimeoutEndLine(lines, i)

				// Find the first line inside the callback (after the opening brace)
				let callbackStartLine = startLine
				for (let j = i + 1; j <= endLine; j++) {
					if (
						lines[j - 1].trim() &&
						!lines[j - 1].includes('setTimeout') &&
						!lines[j - 1].includes('},')
					) {
						callbackStartLine = j
						break
					}
				}

				blocks.push({
					startLine,
					endLine: endLine + 1,
					callbackStartLine,
				})
			}
		}

		return blocks
	}

	private identifyAllPromiseBlocks(lines: string[]): Array<{
		startLine: number
		endLine: number
		callbackStartLine: number
	}> {
		const blocks: Array<{
			startLine: number
			endLine: number
			callbackStartLine: number
		}> = []

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim()
			if (line.includes('.then(')) {
				const startLine = i + 1
				const endLine = this.findPromiseEndLine(lines, i)

				// Find the first line inside the .then callback
				let callbackStartLine = startLine
				for (let j = i + 1; j <= endLine; j++) {
					if (
						lines[j - 1].trim() &&
						!lines[j - 1].includes('.then(') &&
						!lines[j - 1].includes('});')
					) {
						callbackStartLine = j
						break
					}
				}

				blocks.push({
					startLine,
					endLine: endLine + 1,
					callbackStartLine,
				})
			}
		}

		return blocks
	}

	private identifyPromiseBlock(
		lines: string[],
		startIndex: number,
	): {
		startLine: number
		endLine: number
		callbackStartLine: number
	} | null {
		// Find the .then() block starting from the Promise.resolve line
		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i].trim()
			if (line.includes('.then(')) {
				const startLine = i + 1
				const endLine = this.findPromiseEndLine(lines, i)

				// Find the first line inside the .then callback
				let callbackStartLine = startLine
				for (let j = i + 1; j <= endLine; j++) {
					if (
						lines[j - 1].trim() &&
						!lines[j - 1].includes('.then(') &&
						!lines[j - 1].includes('});')
					) {
						callbackStartLine = j
						break
					}
				}

				return {
					startLine,
					endLine: endLine + 1,
					callbackStartLine,
				}
			}
		}
		return null
	}

	private findPromiseEndLine(lines: string[], startIndex: number): number {
		// Find where the .then() block ends (look for the closing });
		let braceCount = 0
		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i]
			braceCount += (line.match(/\{/g) || []).length
			braceCount -= (line.match(/\}/g) || []).length

			// If we find the closing brace and semicolon, this is the end
			if (braceCount === 0 && line.includes(');')) {
				return i
			}
		}
		return startIndex // fallback
	}

	private findSetTimeoutEndLine(lines: string[], startIndex: number): number {
		// Find where the setTimeout block ends (look for the closing });
		let braceCount = 0
		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i]
			braceCount += (line.match(/\{/g) || []).length
			braceCount -= (line.match(/\}/g) || []).length

			// If we find the closing brace and semicolon, this is the end
			if (braceCount === 0 && line.includes(');')) {
				return i
			}
		}
		return startIndex // fallback
	}

	private simulateConsoleLog(line: string, lineNumber: number) {
		const funcName = 'console.log'

		// Extract the message from console.log
		const match = line.match(/console\.log\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/)
		const message = match ? match[1] : 'undefined'

		const callStackItem: CallStackItem = {
			id: this.generateId(),
			name: funcName,
			lineNumber,
		}

		// Add to call stack
		this.callStack.push(callStackItem)
		this.steps.push({
			id: this.generateId(),
			type: 'function-call',
			description: `Called ${funcName}('${message}') - added to call stack`,
			lineNumber,
			state: {
				callStack: [...this.callStack],
				callbackQueue: [...this.callbackQueue],
				webAPIs: [...this.webAPIs],
			},
			consoleLogs: [
				{
					id: `log-${this.stepId}`,
					timestamp: Date.now(),
					message,
					type: 'log' as const,
				},
			],
		})

		// Execute immediately (synchronous)
		this.callStack.pop()
		this.steps.push({
			id: this.generateId(),
			type: 'function-return',
			description: `${funcName} executed and removed from call stack`,
			lineNumber,
			state: {
				callStack: [...this.callStack],
				callbackQueue: [...this.callbackQueue],
				webAPIs: [...this.webAPIs],
			},
		})
	}

	private simulateSetInterval(line: string, lineNumber: number) {
		const match = line.match(/setInterval\s*\(\s*.*?,\s*(\d+)\s*\)/)
		const interval = match ? parseInt(match[1]) : 1000

		const webApiItem: WebAPIItem = {
			id: this.generateId(),
			name: `setInterval(${interval}ms)`,
			type: 'setInterval',
			timeRemaining: interval,
			lineNumber,
		}

		this.webAPIs.push(webApiItem)
		this.steps.push({
			id: this.generateId(),
			type: 'web-api',
			description: `setInterval registered with Web APIs (repeats every ${interval}ms)`,
			lineNumber,
		})
	}

	getCurrentState(/* stepIndex: number */) {
		// This is a simplified version - in a real implementation,
		// we'd need to track state changes at each step
		return {
			callStack: this.callStack,
			callbackQueue: this.callbackQueue,
			webAPIs: this.webAPIs,
		}
	}
}
