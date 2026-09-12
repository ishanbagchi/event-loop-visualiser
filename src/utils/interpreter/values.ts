import type * as acorn from 'acorn'
import type { Scope, Value } from './environment'
import { SimulatedPromise } from './promise'

export interface InterpretedFunction {
	readonly __interpretedFunction: true
	name: string
	params: acorn.Pattern[]
	body: acorn.BlockStatement | acorn.Expression
	closure: Scope
	isArrow: boolean
	isAsync: boolean
	isGenerator: boolean
	homeClass?: InterpretedClass
}

export function isInterpretedFunction(
	value: unknown,
): value is InterpretedFunction {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { __interpretedFunction?: true }).__interpretedFunction === true
	)
}

export interface InterpretedGenerator {
	readonly __interpretedGenerator: true
	name: string
	gen: Generator<Value, Value, Value> | null
	done: boolean
}

export function isInterpretedGenerator(
	value: unknown,
): value is InterpretedGenerator {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { __interpretedGenerator?: true }).__interpretedGenerator === true
	)
}

export interface ClassField {
	key: string
	valueNode: acorn.Expression | null
}

export interface InterpretedClass {
	readonly __interpretedClass: true
	name: string
	prototype: Record<string, Value>
	staticProps: Record<string, Value>
	fieldInits: ClassField[]
	staticFieldInits: ClassField[]
	staticBlocks: acorn.StaticBlock[]
	constructorNode: acorn.FunctionExpression | null
	superClass: InterpretedClass | null
	nativeSuper: ((...args: unknown[]) => unknown) | null
	classScope: Scope
}

export function isInterpretedClass(value: unknown): value is InterpretedClass {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { __interpretedClass?: true }).__interpretedClass === true
	)
}

const classNameByPrototype = new WeakMap<object, string>()

export function registerClassName(prototype: object, name: string): void {
	if (name) classNameByPrototype.set(prototype, name)
}

function classNameOf(value: object): string | undefined {
	let proto: object | null = Object.getPrototypeOf(value)
	while (proto) {
		const name = classNameByPrototype.get(proto)
		if (name) return name
		proto = Object.getPrototypeOf(proto)
	}
	return undefined
}

export function stringifyValue(value: Value): string {
	if (typeof value === 'string') return value
	if (value === undefined) return 'undefined'
	if (value === null) return 'null'
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value)
	}
	if (Array.isArray(value)) {
		return `[ ${value.map(stringifyValue).join(', ')} ]`
	}
	if (isInterpretedFunction(value)) {
		return `[Function: ${value.name || 'anonymous'}]`
	}
	if (isInterpretedClass(value)) {
		return `[class ${value.name || 'anonymous'}]`
	}
	if (isInterpretedGenerator(value)) {
		return 'Object [Generator] {}'
	}
	if (value instanceof SimulatedPromise) {
		if (value.state === 'pending') return 'Promise { <pending> }'
		if (value.state === 'fulfilled') {
			return `Promise { ${stringifyValue(value.value)} }`
		}
		return `Promise { <rejected> ${stringifyValue(value.value)} }`
	}
	if (value instanceof Map) {
		const entries = [...value.entries()]
			.map(([k, v]) => `${stringifyValue(k)} => ${stringifyValue(v)}`)
			.join(', ')
		return `Map(${value.size}) {${entries ? ` ${entries} ` : ''}}`
	}
	if (value instanceof Set) {
		const entries = [...value].map(stringifyValue).join(', ')
		return `Set(${value.size}) {${entries ? ` ${entries} ` : ''}}`
	}
	if (value instanceof Date) return value.toISOString()
	if (value instanceof RegExp) return value.toString()
	if (value instanceof Error) return String(value)
	if (typeof value === 'function')
		return `[Function: ${value.name || 'anonymous'}]`
	if (typeof value === 'object') {
		const className = classNameOf(value)
		let body: string
		try {
			body = JSON.stringify(value) ?? '{}'
		} catch {
			body = '[object Object]'
		}
		return className ? `${className} ${body}` : body
	}
	return String(value)
}
