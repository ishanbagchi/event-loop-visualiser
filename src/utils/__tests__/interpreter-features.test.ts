import { describe, it, expect } from 'vitest'
import { CodeExecutionSimulator } from '../codeSimulator'

describe('Interpreter: broader JS feature support', () => {
	const sim = new CodeExecutionSimulator()
	const run = (code: string) =>
		sim
			.simulateCode(code)
			.flatMap((s) => s.consoleLogs?.map((l) => l.message) ?? [])

	it('try/catch/finally + throw', () => {
		expect(
			run(`
try {
  throw new Error('boom')
} catch (e) {
  console.log('caught', e.message)
} finally {
  console.log('done')
}
`),
		).toEqual(['caught boom', 'done'])
	})

	it('switch statement', () => {
		expect(
			run(`
const x = 2
switch (x) {
  case 1: console.log('one'); break
  case 2: console.log('two')
  case 3: console.log('three'); break
  default: console.log('other')
}
`),
		).toEqual(['two', 'three'])
	})

	it('optional chaining and nullish coalescing', () => {
		expect(
			run(`
const obj = { a: { b: 1 } }
console.log(obj?.a?.b)
console.log(obj?.z?.q)
console.log(obj.z ?? 'fallback')
`),
		).toEqual(['1', 'undefined', 'fallback'])
	})

	it('array methods via native dispatch', () => {
		expect(
			run(`
const arr = [1,2,3]
console.log(arr.map(x => x * 2).join(','))
console.log(arr.filter(x => x > 1).length)
console.log(arr.reduce((a,b) => a+b, 0))
`),
		).toEqual(['2,4,6', '2', '6'])
	})

	it('static class members and getters', () => {
		expect(
			run(`
class Counter {
  static count = 0
  constructor() { Counter.count++ }
  get doubled() { return Counter.count * 2 }
}
new Counter()
new Counter()
console.log(Counter.count)
console.log(new Counter().doubled)
`),
		).toEqual(['2', '6'])
	})

	it('Promise.all', () => {
		expect(
			run(`
Promise.all([Promise.resolve(1), Promise.resolve(2), 3]).then(vals => console.log(vals.join(',')))
`),
		).toEqual(['1,2,3'])
	})
})
