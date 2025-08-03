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
	private lines: string[] = []

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
		this.lines = lines // Store for later use
		const pendingCallbacks: Array<{
			callback: CallbackQueueItem
			delay: number
		}> = []

		// Parse function declarations first
		const functionDeclarations = this.parseFunctionDeclarations(lines)

		// Pre-identify setTimeout blocks to avoid processing their content as synchronous code
		const setTimeoutBlocks = this.identifySetTimeoutBlocks(lines)
		// Pre-identify Promise blocks to avoid processing their .then() content as synchronous code
		const promiseBlocks = this.identifyAllPromiseBlocks(lines)

		// First pass: Process all synchronous code (skip setTimeout and Promise callback content)
		lines.forEach((line, index) => {
			const lineNumber = index + 1
			const trimmedLine = line.trim()

			if (!trimmedLine) return

			// Skip lines that are inside function bodies (except function declarations)
			const isInsideFunctionBody = Array.from(
				functionDeclarations.values(),
			).some(
				(func) =>
					lineNumber > func.startLine && lineNumber <= func.endLine,
			)
			if (isInsideFunctionBody) return

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
				// Extract timeout delay from the current line or the following lines
				let delay = 0

				// Try multiple patterns to extract the delay
				const patterns = [
					/setTimeout\s*\([^,]*,\s*(\d+)\s*\)/, // setTimeout(callback, 1000)
					/},\s*(\d+)\s*\)/, // }, 1000)
					/\),\s*(\d+)\s*\)/, // ), 1000)
				]

				// First try to find the delay in the current line only
				for (const pattern of patterns) {
					const match = trimmedLine.match(pattern)
					if (match) {
						delay = parseInt(match[1])
						break
					}
				}

				// If no delay found in current line, look ahead in subsequent lines for this specific setTimeout
				if (delay === 0) {
					// Look ahead up to 5 lines to find the delay (for multiline setTimeout)
					for (
						let lookAhead = 1;
						lookAhead <= 5 && index + lookAhead < lines.length;
						lookAhead++
					) {
						const futureLineContent =
							lines[index + lookAhead].trim()
						for (const pattern of patterns) {
							const match = futureLineContent.match(pattern)
							if (match) {
								delay = parseInt(match[1])
								break
							}
						}
						if (delay > 0) break
					}
				}

				// Step 1: setTimeout() called - added to call stack
				const callStackItem: CallStackItem = {
					id: this.generateId(),
					name: 'setTimeout',
					lineNumber,
				}
				this.callStack.push(callStackItem)

				this.steps.push({
					id: this.generateId(),
					type: 'function-call',
					description: `setTimeout() called - added to call stack`,
					lineNumber,
					state: {
						callStack: [...this.callStack],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Step 2: Timer registered with Web APIs and setTimeout() removed from call stack
				const webApiItem: WebAPIItem = {
					id: this.generateId(),
					name: `setTimeout(${delay}ms)`,
					type: 'setTimeout',
					timeRemaining: delay,
					lineNumber,
				}
				this.webAPIs.push(webApiItem)
				this.callStack.pop() // Remove setTimeout from call stack

				this.steps.push({
					id: this.generateId(),
					type: 'web-api',
					description: `setTimeout() executed - timer registered with Web APIs for ${delay}ms`,
					lineNumber,
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
				// Step 1: Promise.resolve() called - added to call stack
				const callStackItem: CallStackItem = {
					id: this.generateId(),
					name: 'Promise.resolve',
					lineNumber,
				}
				this.callStack.push(callStackItem)

				this.steps.push({
					id: this.generateId(),
					type: 'function-call',
					description:
						'Promise.resolve() called - added to call stack',
					lineNumber,
					state: {
						callStack: [...this.callStack],
						callbackQueue: [...this.callbackQueue],
						webAPIs: [...this.webAPIs],
					},
				})

				// Step 2: Promise registered with Web APIs and Promise.resolve() removed from call stack
				const webApiItem: WebAPIItem = {
					id: this.generateId(),
					name: 'Promise resolution',
					type: 'other',
					timeRemaining: 0,
					lineNumber,
				}
				this.webAPIs.push(webApiItem)
				this.callStack.pop() // Remove Promise.resolve from call stack

				this.steps.push({
					id: this.generateId(),
					type: 'web-api',
					description:
						'Promise.resolve() executed - promise registered with Web APIs',
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
			} else if (this.isFunctionCall(trimmedLine)) {
				this.simulateFunctionCall(
					trimmedLine,
					lineNumber,
					functionDeclarations,
				)
			}
			// Skip function declarations as they are hoisted and don't execute
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

									// Add console.log to call stack
									const consoleCallStackItem: CallStackItem =
										{
											id: this.generateId(),
											name: 'console.log',
											lineNumber: lineNum,
										}
									this.callStack.push(consoleCallStackItem)

									this.steps.push({
										id: this.generateId(),
										type: 'function-call',
										description: `console.log(${message}) called inside Promise.then - added to call stack`,
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

									// Remove console.log from call stack
									this.callStack.pop()

									this.steps.push({
										id: this.generateId(),
										type: 'function-return',
										description: `console.log executed and removed from call stack`,
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
									const statementCallStackItem: CallStackItem =
										{
											id: this.generateId(),
											name: callbackLine.trim(),
											lineNumber: lineNum,
										}
									this.callStack.push(statementCallStackItem)

									this.steps.push({
										id: this.generateId(),
										type: 'function-call',
										description: `Executing: ${callbackLine.trim()} - added to call stack`,
										lineNumber: lineNum,
										state: {
											callStack: [...this.callStack],
											callbackQueue: [
												...this.callbackQueue,
											],
											webAPIs: [...this.webAPIs],
										},
									})

									// Remove statement from call stack
									this.callStack.pop()

									this.steps.push({
										id: this.generateId(),
										type: 'function-return',
										description: `Statement executed and removed from call stack`,
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

									// Add console.log to call stack
									const consoleCallStackItem: CallStackItem =
										{
											id: this.generateId(),
											name: 'console.log',
											lineNumber: lineNum,
										}
									this.callStack.push(consoleCallStackItem)

									this.steps.push({
										id: this.generateId(),
										type: 'function-call',
										description: `console.log('${message}') called inside callback - added to call stack`,
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

									// Remove console.log from call stack
									this.callStack.pop()

									this.steps.push({
										id: this.generateId(),
										type: 'function-return',
										description: `console.log executed and removed from call stack`,
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
									const statementCallStackItem: CallStackItem =
										{
											id: this.generateId(),
											name: callbackLine.trim(),
											lineNumber: lineNum,
										}
									this.callStack.push(statementCallStackItem)

									this.steps.push({
										id: this.generateId(),
										type: 'function-call',
										description: `Executing: ${callbackLine.trim()} - added to call stack`,
										lineNumber: lineNum,
										state: {
											callStack: [...this.callStack],
											callbackQueue: [
												...this.callbackQueue,
											],
											webAPIs: [...this.webAPIs],
										},
									})

									// Remove statement from call stack
									this.callStack.pop()

									this.steps.push({
										id: this.generateId(),
										type: 'function-return',
										description: `Statement executed and removed from call stack`,
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

		// Step 1: setInterval() called - added to call stack
		const callStackItem: CallStackItem = {
			id: this.generateId(),
			name: 'setInterval',
			lineNumber,
		}
		this.callStack.push(callStackItem)

		this.steps.push({
			id: this.generateId(),
			type: 'function-call',
			description: `setInterval() called - added to call stack`,
			lineNumber,
			state: {
				callStack: [...this.callStack],
				callbackQueue: [...this.callbackQueue],
				webAPIs: [...this.webAPIs],
			},
		})

		// Step 2: Timer registered with Web APIs and setInterval() removed from call stack
		const webApiItem: WebAPIItem = {
			id: this.generateId(),
			name: `setInterval(${interval}ms)`,
			type: 'setInterval',
			timeRemaining: interval,
			lineNumber,
		}
		this.webAPIs.push(webApiItem)
		this.callStack.pop() // Remove setInterval from call stack

		this.steps.push({
			id: this.generateId(),
			type: 'web-api',
			description: `setInterval() executed - timer registered with Web APIs (repeats every ${interval}ms)`,
			lineNumber,
			state: {
				callStack: [...this.callStack],
				callbackQueue: [...this.callbackQueue],
				webAPIs: [...this.webAPIs],
			},
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

	private parseFunctionDeclarations(
		lines: string[],
	): Map<string, { startLine: number; endLine: number }> {
		const functions = new Map<
			string,
			{ startLine: number; endLine: number }
		>()

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim()
			// Match both single-line and multiline function declarations
			const match = line.match(/function\s+(\w+)\s*\(\s*\)\s*\{/)
			if (match) {
				const functionName = match[1]
				const startLine = i + 1
				const endLine = this.findFunctionEndLine(lines, i)
				functions.set(functionName, { startLine, endLine })
			}
		}

		return functions
	}

	private findFunctionEndLine(lines: string[], startIndex: number): number {
		const startLine = lines[startIndex]

		// Check if this is a single-line function (opening and closing brace on same line)
		const openBraces = (startLine.match(/\{/g) || []).length
		const closeBraces = (startLine.match(/\}/g) || []).length
		if (openBraces > 0 && openBraces === closeBraces) {
			return startIndex + 1 // Single-line function
		}

		// Multi-line function - count braces across lines
		let braceCount = 0
		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i]
			braceCount += (line.match(/\{/g) || []).length
			braceCount -= (line.match(/\}/g) || []).length

			if (braceCount === 0 && i > startIndex) {
				return i + 1 // Return 1-based line number
			}
		}
		return startIndex + 1 // Return 1-based line number
	}

	private isFunctionCall(line: string): boolean {
		// Check if it's a function call pattern: functionName();
		const functionCallPattern = /^\s*(\w+)\s*\(\s*\)\s*;?\s*$/
		return (
			functionCallPattern.test(line) &&
			!line.includes('function') &&
			!line.includes('console.log') &&
			!line.includes('setTimeout') &&
			!line.includes('setInterval') &&
			!line.includes('Promise')
		)
	}

	private simulateFunctionCall(
		line: string,
		lineNumber: number,
		functionDeclarations: Map<
			string,
			{ startLine: number; endLine: number }
		>,
	) {
		const match = line.match(/^\s*(\w+)\s*\(\s*\)\s*;?\s*$/)
		if (!match) return

		const functionName = match[1]
		const callStackItem: CallStackItem = {
			id: this.generateId(),
			name: functionName,
			lineNumber,
		}

		// Add function to call stack
		this.callStack.push(callStackItem)
		this.steps.push({
			id: this.generateId(),
			type: 'function-call',
			description: `Called ${functionName}() - added to call stack`,
			lineNumber,
			state: {
				callStack: [...this.callStack],
				callbackQueue: [...this.callbackQueue],
				webAPIs: [...this.webAPIs],
			},
		})

		// Execute function body if it exists
		const functionDef = functionDeclarations.get(functionName)
		if (functionDef) {
			this.executeFunctionBody(functionDef, functionDeclarations)
		}

		// Remove function from call stack
		this.callStack.pop()
		this.steps.push({
			id: this.generateId(),
			type: 'function-return',
			description: `${functionName}() completed - removed from call stack`,
			lineNumber,
			state: {
				callStack: [...this.callStack],
				callbackQueue: [...this.callbackQueue],
				webAPIs: [...this.webAPIs],
			},
		})
	}

	private executeFunctionBody(
		functionDef: { startLine: number; endLine: number },
		functionDeclarations: Map<
			string,
			{ startLine: number; endLine: number }
		>,
	) {
		const lines = this.getCurrentLines()

		// For single-line functions, extract the body content from the same line
		if (functionDef.startLine === functionDef.endLine) {
			const line = lines[functionDef.startLine - 1]
			if (!line) return

			// Extract content between { and }
			const bodyMatch = line.match(/\{([^}]*)\}/)
			if (bodyMatch && bodyMatch[1].trim()) {
				const bodyContent = bodyMatch[1].trim()

				// Check if the body content is a function call
				if (this.isFunctionCall(bodyContent)) {
					this.simulateFunctionCall(
						bodyContent,
						functionDef.startLine,
						functionDeclarations,
					)
				} else if (bodyContent.includes('console.log')) {
					this.simulateConsoleLog(bodyContent, functionDef.startLine)
				}
			}
			return
		}

		// Execute each line in the function body for multi-line functions
		for (
			let lineNum = functionDef.startLine;
			lineNum <= functionDef.endLine;
			lineNum++
		) {
			const line = lines[lineNum - 1]
			if (!line) continue

			let trimmedLine = line.trim()

			// Skip function declaration line
			if (trimmedLine.startsWith('function')) {
				continue
			}

			// If line contains a closing brace, remove it to process the code before it
			if (trimmedLine.includes('}')) {
				trimmedLine = trimmedLine.replace(/\s*}\s*$/, '').trim()
			}

			// Skip empty lines
			if (!trimmedLine) {
				continue
			}

			if (this.isFunctionCall(trimmedLine)) {
				this.simulateFunctionCall(
					trimmedLine,
					lineNum,
					functionDeclarations,
				)
			} else if (trimmedLine.includes('console.log')) {
				this.simulateConsoleLog(trimmedLine, lineNum)
			}
			// Add other statement types as needed
		}
	}

	private getCurrentLines(): string[] {
		return this.lines
	}
}
