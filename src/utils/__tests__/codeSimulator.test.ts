import { describe, it, expect, beforeEach } from 'vitest'
import { CodeExecutionSimulator } from '../codeSimulator'

describe('CodeExecutionSimulator', () => {
	let simulator: CodeExecutionSimulator

	beforeEach(() => {
		simulator = new CodeExecutionSimulator()
	})

	describe('Basic console.log execution', () => {
		it('should simulate console.log execution correctly', () => {
			const code = `console.log('Hello World')`
			const steps = simulator.simulateCode(code)

			expect(steps).toHaveLength(2)
			expect(steps[0].type).toBe('function-call')
			expect(steps[0].description).toContain('console.log')
			expect(steps[0].consoleLogs?.[0].message).toBe('Hello World')

			expect(steps[1].type).toBe('function-return')
			expect(steps[1].description).toContain('executed and removed')
		})

		it('should handle multiple console.log statements', () => {
			const code = `
console.log('First')
console.log('Second')
      `
			const steps = simulator.simulateCode(code)

			expect(steps).toHaveLength(4)
			expect(steps[0].consoleLogs?.[0].message).toBe('First')
			expect(steps[2].consoleLogs?.[0].message).toBe('Second')
		})
	})

	describe('setTimeout execution', () => {
		it('should simulate setTimeout correctly', () => {
			const code = `
console.log('Start')
setTimeout(() => {
  console.log('Timeout')
}, 1000)
console.log('End')
      `
			const steps = simulator.simulateCode(code)

			const syncSteps = steps.filter(
				(step) =>
					step.description.includes('Start') ||
					step.description.includes('End') ||
					step.description.includes('setTimeout'),
			)

			const callbackSteps = steps.filter(
				(step) =>
					step.description.includes('Timer completed') ||
					step.description.includes('callback'),
			)

			expect(syncSteps.length).toBeGreaterThan(0)
			expect(callbackSteps.length).toBeGreaterThan(0)
		})

		it('should register setTimeout with Web APIs', () => {
			const code = `setTimeout(() => { console.log('test') }, 500)`
			const steps = simulator.simulateCode(code)

			const webApiStep = steps.find(
				(step) =>
					step.type === 'web-api' &&
					step.description.includes('timer registered with Web APIs'),
			)
			expect(webApiStep).toBeTruthy()
			expect(webApiStep?.description).toContain('500ms')
		})
	})

	describe('Promise execution', () => {
		it('should simulate Promise.resolve correctly', () => {
			const code = `
console.log('Start')
Promise.resolve('Promise result').then(result => {
  console.log(result)
})
console.log('End')
      `
			const steps = simulator.simulateCode(code)

			const promiseSteps = steps.filter((step) =>
				step.description.includes('Promise'),
			)

			expect(promiseSteps.length).toBeGreaterThan(0)

			const webApiStep = steps.find(
				(step) =>
					step.type === 'web-api' &&
					step.description.includes('promise registered with Web APIs'),
			)
			expect(webApiStep).toBeTruthy()
		})

		it('should handle Promise callback execution', () => {
			const code = `Promise.resolve('test').then(result => { console.log(result) })`
			const steps = simulator.simulateCode(code)

			const callbackQueueStep = steps.find(
				(step) =>
					step.type === 'callback-queue' &&
					step.description.includes('microtask queue'),
			)
			expect(callbackQueueStep).toBeTruthy()

			const promiseCallStep = steps.find(
				(step) =>
					step.type === 'function-call' &&
					step.description.includes('Promise.then callback'),
			)
			expect(promiseCallStep).toBeTruthy()
		})
	})

	describe('State snapshots', () => {
		it('should include state snapshots in execution steps', () => {
			const code = `console.log('test')`
			const steps = simulator.simulateCode(code)

			const stepWithState = steps.find((step) => step.state)
			expect(stepWithState).toBeTruthy()
			expect(stepWithState?.state).toHaveProperty('callStack')
			expect(stepWithState?.state).toHaveProperty('callbackQueue')
			expect(stepWithState?.state).toHaveProperty('webAPIs')
		})

		it('should track call stack changes in state', () => {
			const code = `console.log('test')`
			const steps = simulator.simulateCode(code)

			const callStep = steps.find((step) => step.type === 'function-call')
			const returnStep = steps.find((step) => step.type === 'function-return')

			expect(callStep?.state?.callStack).toHaveLength(1)
			expect(returnStep?.state?.callStack).toHaveLength(0)
		})
	})

	describe('Execution order', () => {
		it('should execute synchronous code before asynchronous callbacks', () => {
			const code = `
console.log('Start')
setTimeout(() => { console.log('Timeout') }, 0)
Promise.resolve('Promise').then(result => { console.log(result) })
console.log('End')
      `
			const steps = simulator.simulateCode(code)

			const consoleSteps = steps.filter((step) => step.consoleLogs?.length)
			const messages = consoleSteps.map(
				(step) => step.consoleLogs?.[0]?.message,
			)

			expect(messages).toContain('Start')
			expect(messages).toContain('End')

			const setTimeoutStep = steps.find(
				(step) =>
					step.type === 'web-api' &&
					step.description.includes('timer registered with Web APIs'),
			)
			expect(setTimeoutStep).toBeTruthy()

			const promiseStep = steps.find(
				(step) =>
					step.type === 'web-api' &&
					step.description.includes('promise registered with Web APIs'),
			)
			expect(promiseStep).toBeTruthy()
		})

		it('fires a timer scheduled from inside a callback relative to the virtual clock, not t=0', () => {
			const code = `
setTimeout(() => {
  console.log('A')
  setTimeout(() => { console.log('inner') }, 10)
}, 100)
setTimeout(() => { console.log('B') }, 105)
      `
			const steps = simulator.simulateCode(code)
			const messages = steps
				.flatMap((step) => step.consoleLogs ?? [])
				.map((log) => log.message)

			expect(messages).toEqual(['A', 'B', 'inner'])
		})
	})

	describe('Real expression evaluation (post regex-to-interpreter rewrite)', () => {
		it('evaluates variables and arithmetic instead of printing undefined', () => {
			const code = `const a = 12\nconst b = 23\nconsole.log(a + b)`
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['35'])
		})

		it('supports multiple console.log arguments joined by spaces', () => {
			const code = `console.log('a', 1, true)`
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['a 1 true'])
		})

		it('supports template literals', () => {
			const code = `const name = 'World'\nconsole.log(\`Hello, \${name}!\`)`
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['Hello, World!'])
		})
	})

	describe('Promise chaining', () => {
		it('chains .then().then() with real value propagation', () => {
			const code = `Promise.resolve(1)
	.then(v => v + 1)
	.then(v => console.log(v))`
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['2'])
		})

		it('propagates rejection to .catch()', () => {
			const code = `Promise.reject('failure')
	.then(v => console.log('fulfilled', v))
	.catch(err => console.log('caught', err))`
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['caught failure'])
		})
	})

	describe('setInterval', () => {
		it('fires its callback body, unlike the old no-op implementation', () => {
			const code = `setInterval(() => { console.log('tick') }, 1000)`
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages.length).toBeGreaterThan(0)
			expect(messages.every((m) => m === 'tick')).toBe(true)
		})
	})

	describe('Loops', () => {
		it('runs a for loop, unlike the old regex engine which flagged it as unsupported', () => {
			const code = `for (let i = 0; i < 3; i++) { console.log(i) }`
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['0', '1', '2'])
		})

		it('captures a fresh `let` binding per iteration for closures', () => {
			const code = `
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
      `
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['0', '1', '2'])
		})

		it('supports while, for-of, break and continue', () => {
			const code = `
let n = 0
while (n < 5) {
  n++
  if (n === 2) continue
  if (n === 4) break
  console.log('n', n)
}
for (const x of [1, 2, 3]) {
  console.log('x', x)
}
      `
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['n 1', 'n 3', 'x 1', 'x 2', 'x 3'])
		})
	})

	describe('Classes', () => {
		it('supports constructors, methods and inheritance', () => {
			const code = `
class Animal {
  constructor(name) { this.name = name }
  speak() { return this.name + ' makes a sound' }
}
class Dog extends Animal {
  speak() { return super.speak() + ' (bark)' }
}
console.log(new Dog('Rex').speak())
      `
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['Rex makes a sound (bark)'])
		})
	})

	describe('async/await', () => {
		it('suspends at await and resumes as a microtask', () => {
			const code = `
async function main() {
  console.log('start')
  const value = await Promise.resolve('resolved')
  console.log(value)
}
main()
console.log('sync')
      `
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['start', 'sync', 'resolved'])
		})
	})

	describe('generators', () => {
		it('pauses at yield and resumes only on next()', () => {
			const code = `
function* counter() {
  console.log('a')
  yield 1
  console.log('b')
  yield 2
  console.log('c')
}
const it = counter()
console.log('before')
it.next()
console.log('between')
it.next()
it.next()
      `
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['before', 'a', 'between', 'b', 'c'])
		})

		it('iterates a generator with for...of', () => {
			const code = `
function* range(n) {
  for (let i = 0; i < n; i++) yield i
}
for (const n of range(3)) console.log(n)
      `
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['0', '1', '2'])
		})
	})

	describe('Destructuring and spread', () => {
		it('destructures arrays/objects and spreads into calls', () => {
			const code = `
const [a, , b] = [1, 2, 3]
const { x, ...rest } = { x: 1, y: 2, z: 3 }
console.log(a, b, x, rest.y, rest.z)
console.log(Math.max(...[4, 9, 2]))
      `
			const steps = simulator.simulateCode(code)
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toEqual(['1 3 1 2 3', '9'])
		})
	})

	describe('Unsupported syntax', () => {
		it('surfaces a visible error step instead of silently doing nothing', () => {
			const code = `console.log('before')\nconst gen = async function*() { yield 1 }\nconsole.log('after')`
			const steps = simulator.simulateCode(code)

			const errorStep = steps.find((step) => step.type === 'error')
			expect(errorStep).toBeTruthy()
			expect(errorStep?.consoleLogs?.[0]?.type).toBe('error')

			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toContain('before')
			expect(messages).not.toContain('after')
		})

		it('surfaces an error when a const is redeclared in the same scope', () => {
			const code = `console.log('before')\nconst x = 1\nconst x = 2\nconsole.log('after')`
			const steps = simulator.simulateCode(code)

			const errorStep = steps.find((step) => step.type === 'error')
			expect(errorStep).toBeTruthy()
			expect(errorStep?.consoleLogs?.[0]?.message).toContain(
				"'x' has already been declared",
			)

			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).not.toContain('before')
			expect(messages).not.toContain('after')
		})

		it('allows `var` to redeclare a function parameter of the same name', () => {
			const code = `function f(x) { var x = 2; console.log(x) }\nf(1)`
			const steps = simulator.simulateCode(code)

			expect(steps.find((step) => step.type === 'error')).toBeFalsy()
			const messages = steps.flatMap(
				(step) => step.consoleLogs?.map((log) => log.message) ?? [],
			)
			expect(messages).toContain('2')
		})
	})
})
