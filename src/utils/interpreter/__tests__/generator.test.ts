import { describe, it, expect } from 'vitest'
import { Interpreter } from '../interpreter'

function run(code: string) {
	return new Interpreter().run(code)
}

function messages(steps: ReturnType<typeof run>): string[] {
	return steps.flatMap(
		(step) => step.consoleLogs?.map((log) => log.message) ?? [],
	)
}

describe('generator functions', () => {
	it('yields values in sequence and reports done on completion', () => {
		const code = `
function* g() {
  yield 1
  yield 2
  return 3
}
const it = g()
const a = it.next()
const b = it.next()
const c = it.next()
const d = it.next()
console.log(a.value, a.done)
console.log(b.value, b.done)
console.log(c.value, c.done)
console.log(d.value, d.done)
    `
		expect(messages(run(code))).toEqual([
			'1 false',
			'2 false',
			'3 true',
			'undefined true',
		])
	})

	it('sends values back in via next(value)', () => {
		const code = `
function* g() {
  const x = yield 1
  console.log(x)
}
const it = g()
it.next()
it.next('hi')
    `
		expect(messages(run(code))).toEqual(['hi'])
	})

	it('runs finally blocks on an early return()', () => {
		const code = `
function* g() {
  try {
    yield 1
  } finally {
    console.log('cleanup')
  }
}
const it = g()
it.next()
const r = it.return(42)
console.log(r.value, r.done)
    `
		expect(messages(run(code))).toEqual(['cleanup', '42 true'])
	})

	it('delivers throw() into a matching try/catch', () => {
		const code = `
function* g() {
  try {
    yield 1
  } catch (e) {
    console.log('caught', e)
  }
}
const it = g()
it.next()
it.throw('boom')
    `
		expect(messages(run(code))).toEqual(['caught boom'])
	})

	it('propagates throw() out when there is no matching catch', () => {
		const code = `
function* g() {
  yield 1
}
const it = g()
it.next()
it.throw('boom')
console.log('unreachable')
    `
		const steps = run(code)
		const errorStep = steps.find((step) => step.type === 'error')
		expect(errorStep).toBeTruthy()
		expect(messages(steps)).not.toContain('unreachable')
	})

	it('supports yield* delegation to another generator', () => {
		const code = `
function* inner() {
  yield 1
  yield 2
}
function* outer() {
  yield* inner()
  yield 3
}
for (const n of outer()) console.log(n)
    `
		expect(messages(run(code))).toEqual(['1', '2', '3'])
	})

	it('does not touch the call stack until next() is called', () => {
		const code = `
function* g() {
  yield 1
}
const it = g()
console.log('created')
it.next()
    `
		const steps = run(code)
		const callSteps = steps.filter(
			(step) =>
				(step.type === 'function-call' || step.type === 'function-return') &&
				step.description.includes('g()'),
		)
		expect(callSteps).toHaveLength(2)
		expect(callSteps[0].description).toContain('Resumed g() at yield')
		expect(callSteps[1].description).toContain('g() suspended at yield')
	})
})
