import { describe, it, expect } from 'vitest'
import { InterpreterError, Scope } from '../environment'

describe('Scope', () => {
	it('declares and reads a binding', () => {
		const scope = new Scope()
		scope.declare('a', 1, 'let')
		expect(scope.get('a')).toBe(1)
	})

	it('resolves bindings through the parent chain (closures)', () => {
		const outer = new Scope()
		outer.declare('x', 10, 'const')
		const inner = outer.child()
		expect(inner.get('x')).toBe(10)
	})

	it('a child scope can shadow a parent binding without mutating it', () => {
		const outer = new Scope()
		outer.declare('x', 1, 'let')
		const inner = outer.child()
		inner.declare('x', 2, 'let')
		expect(inner.get('x')).toBe(2)
		expect(outer.get('x')).toBe(1)
	})

	it('set() reassigns through the parent chain', () => {
		const outer = new Scope()
		outer.declare('x', 1, 'let')
		const inner = outer.child()
		inner.set('x', 5)
		expect(outer.get('x')).toBe(5)
	})

	it('throws on reassigning a const', () => {
		const scope = new Scope()
		scope.declare('x', 1, 'const')
		expect(() => scope.set('x', 2)).toThrow(InterpreterError)
	})

	it('throws when reading an undeclared identifier', () => {
		const scope = new Scope()
		expect(() => scope.get('missing')).toThrow(InterpreterError)
	})

	it('throws when redeclaring a const in the same scope', () => {
		const scope = new Scope()
		scope.declare('x', 1, 'const')
		expect(() => scope.declare('x', 2, 'const')).toThrow(InterpreterError)
	})

	it('throws when redeclaring a let in the same scope', () => {
		const scope = new Scope()
		scope.declare('x', 1, 'let')
		expect(() => scope.declare('x', 2, 'let')).toThrow(InterpreterError)
	})

	it('throws when a let/const collides with an existing var in the same scope', () => {
		const scope = new Scope()
		scope.declare('x', 1, 'var')
		expect(() => scope.declare('x', 2, 'let')).toThrow(InterpreterError)
	})

	it('throws when a var collides with an existing let/const in the same scope', () => {
		const scope = new Scope()
		scope.declare('x', 1, 'let')
		expect(() => scope.declare('x', 2, 'var')).toThrow(InterpreterError)
	})

	it('allows redeclaring the same var twice in the same scope', () => {
		const scope = new Scope()
		scope.declare('x', 1, 'var')
		scope.declare('x', 2, 'var')
		expect(scope.get('x')).toBe(2)
	})

	it('allows a child scope to shadow a var declared in the parent', () => {
		const outer = new Scope()
		outer.declare('x', 1, 'var')
		const inner = outer.child()
		expect(() => inner.declare('x', 2, 'var')).not.toThrow()
	})
})
