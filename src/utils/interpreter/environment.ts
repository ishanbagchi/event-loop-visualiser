export type Value = unknown

interface Binding {
	value: Value
	kind: 'let' | 'const' | 'var'
}

export class InterpreterError extends Error {}

export class Scope {
	private readonly bindings = new Map<string, Binding>()
	private readonly parent: Scope | null

	constructor(parent: Scope | null = null) {
		this.parent = parent
	}

	child(): Scope {
		return new Scope(this)
	}

	declare(name: string, value: Value, kind: Binding['kind']): void {
		const existing = this.bindings.get(name)
		if (existing && (existing.kind !== 'var' || kind !== 'var')) {
			throw new InterpreterError(
				`Identifier '${name}' has already been declared`,
			)
		}
		this.bindings.set(name, { value, kind })
	}

	has(name: string): boolean {
		return this.bindings.has(name) || (this.parent?.has(name) ?? false)
	}

	get(name: string): Value {
		const binding = this.bindings.get(name)
		if (binding) return binding.value
		if (this.parent) return this.parent.get(name)
		throw new InterpreterError(`${name} is not defined`)
	}

	set(name: string, value: Value): void {
		const binding = this.bindings.get(name)
		if (binding) {
			if (binding.kind === 'const') {
				throw new InterpreterError(`Assignment to constant variable '${name}'.`)
			}
			binding.value = value
			return
		}
		if (this.parent) {
			this.parent.set(name, value)
			return
		}
		throw new InterpreterError(`${name} is not defined`)
	}
}
