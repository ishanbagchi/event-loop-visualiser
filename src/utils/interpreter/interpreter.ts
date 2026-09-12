import * as acorn from 'acorn'
import type { CallbackQueueItem, ExecutionStep, WebAPIItem } from '../../types'
import { InterpreterError, Scope, type Value } from './environment'
import { Scheduler } from './scheduler'
import { SimulatedPromise } from './promise'
import { Trace } from './trace'
import {
	isInterpretedClass,
	isInterpretedFunction,
	isInterpretedGenerator,
	registerClassName,
	stringifyValue,
	type ClassField,
	type InterpretedClass,
	type InterpretedFunction,
	type InterpretedGenerator,
} from './values'

class ReturnSignal extends Error {
	readonly value: Value
	constructor(value: Value) {
		super('return')
		this.value = value
	}
}

class BreakSignal extends Error {
	readonly label?: string
	constructor(label?: string) {
		super('break')
		this.label = label
	}
}

class ContinueSignal extends Error {
	readonly label?: string
	constructor(label?: string) {
		super('continue')
		this.label = label
	}
}

/** Wraps a value thrown by user code (`throw <value>`) so it can be told
 * apart from control-flow signals and genuine interpreter faults. */
class ThrownValue extends Error {
	readonly value: Value
	constructor(value: Value) {
		super('user-thrown')
		this.value = value
	}
}

const isControlSignal = (err: unknown): boolean =>
	err instanceof ReturnSignal ||
	err instanceof BreakSignal ||
	err instanceof ContinueSignal

const MAX_FUNCTION_CALLS = 5000
const INTERVAL_REPEAT_COUNT = 3

const memberPropertyKey = (
	property: acorn.Expression | acorn.PrivateIdentifier,
): string =>
	property.type === 'PrivateIdentifier'
		? `#${property.name}`
		: (property as acorn.Identifier).name

type ExecutionContext = 'synchronous' | 'microtask queue' | 'callback queue'

/** Sentinel returned when an optional-chaining link (`?.`) short-circuits;
 * consumed only at the enclosing ChainExpression boundary. */
const OPTIONAL_SKIP: unique symbol = Symbol('optional-skip')

type Gen<T> = Generator<Value, T, Value>

interface HomeFrame {
	instance: Value
	cls: InterpretedClass
}

export class Interpreter {
	private readonly trace = new Trace()
	private readonly scheduler = new Scheduler()
	private readonly promiseWebApiItems = new Map<SimulatedPromise, string>()
	private callBudget = MAX_FUNCTION_CALLS
	private executionContext: ExecutionContext = 'synchronous'
	private readonly homeStack: HomeFrame[] = []

	private runInContext<T>(context: ExecutionContext, fn: () => T): T {
		const previous = this.executionContext
		this.executionContext = context
		try {
			return fn()
		} finally {
			this.executionContext = previous
		}
	}

	run(code: string): ExecutionStep[] {
		try {
			const program = acorn.parse(code, {
				ecmaVersion: 2022,
				locations: true,
			})
			const globalScope = new Scope()
			globalScope.declare('this', undefined, 'const')
			this.installGlobals(globalScope)
			this.driveSync(
				this.executeStatements(program.body as acorn.Statement[], globalScope),
			)
			this.scheduler.run()
		} catch (err) {
			this.emitError(err)
		}
		return this.trace.steps
	}

	private installGlobals(scope: Scope): void {
		const natives: Record<string, unknown> = {
			Math,
			JSON,
			Object,
			Array,
			Number,
			String,
			Boolean,
			Date,
			Map,
			Set,
			RegExp,
			Error,
			TypeError,
			RangeError,
			SyntaxError,
			parseInt,
			parseFloat,
			isNaN,
			isFinite,
			NaN,
			Infinity,
		}
		for (const [name, value] of Object.entries(natives)) {
			scope.declare(name, value as Value, 'const')
		}
		scope.declare('console', { __consoleNamespace: true }, 'const')
		scope.declare('Promise', { __promiseNamespace: true }, 'const')
	}

	private emitError(err: unknown): void {
		const message = this.describeError(err)
		this.trace.push('error', `Execution stopped: ${message}`, undefined, [
			{
				id: this.trace.logId(),
				timestamp: Date.now(),
				message,
				type: 'error',
			},
		])
	}

	private describeError(err: unknown): string {
		if (err instanceof ThrownValue) return stringifyValue(err.value)
		if (err instanceof Error) return err.message
		return String(err)
	}

	/** Drives a generator that must not suspend (i.e. contains no `await`). */
	private driveSync<T>(gen: Gen<T>): T {
		const res = gen.next()
		if (!res.done) {
			throw new InterpreterError('await is only valid inside an async function')
		}
		return res.value
	}

	private lineOf(node: acorn.Node): number | undefined {
		return node.loc?.start.line
	}

	private truthy(value: Value): boolean {
		return Boolean(value)
	}

	private *executeStatements(
		statements: acorn.Statement[],
		scope: Scope,
	): Gen<void> {
		this.hoistFunctionDeclarations(statements, scope)
		for (const statement of statements) {
			if (statement.type === 'FunctionDeclaration') continue
			yield* this.execute(statement, scope)
		}
	}

	private hoistFunctionDeclarations(
		statements: acorn.Statement[],
		scope: Scope,
	): void {
		for (const statement of statements) {
			if (statement.type !== 'FunctionDeclaration') continue
			const fn = this.makeFunction(statement, scope, false)
			scope.declare(statement.id.name, fn, 'var')
		}
	}

	// ---------------------------------------------------------------------
	// Statements
	// ---------------------------------------------------------------------

	private *execute(node: acorn.Statement, scope: Scope): Gen<void> {
		switch (node.type) {
			case 'VariableDeclaration': {
				for (const declarator of node.declarations) {
					const value = declarator.init
						? yield* this.evaluate(declarator.init, scope)
						: undefined
					if (
						node.kind !== 'var' &&
						node.kind !== 'let' &&
						node.kind !== 'const'
					) {
						throw new InterpreterError(
							`Unsupported syntax: ${node.kind} declarations`,
						)
					}
					yield* this.bindPattern(declarator.id, value, scope, node.kind)
				}
				return
			}
			case 'FunctionDeclaration':
				return
			case 'ClassDeclaration': {
				const cls = yield* this.evaluateClass(node, scope)
				if (node.id) scope.declare(node.id.name, cls, 'let')
				return
			}
			case 'ExpressionStatement':
				yield* this.evaluate(node.expression, scope)
				return
			case 'BlockStatement':
				yield* this.executeStatements(node.body, scope.child())
				return
			case 'IfStatement':
				if (this.truthy(yield* this.evaluate(node.test, scope))) {
					yield* this.execute(node.consequent, scope)
				} else if (node.alternate) {
					yield* this.execute(node.alternate, scope)
				}
				return
			case 'ReturnStatement':
				throw new ReturnSignal(
					node.argument
						? yield* this.evaluate(node.argument, scope)
						: undefined,
				)
			case 'ThrowStatement':
				throw new ThrownValue(yield* this.evaluate(node.argument, scope))
			case 'BreakStatement':
				throw new BreakSignal(node.label?.name)
			case 'ContinueStatement':
				throw new ContinueSignal(node.label?.name)
			case 'EmptyStatement':
				return
			case 'ForStatement':
				yield* this.executeFor(node, scope)
				return
			case 'WhileStatement':
				yield* this.executeWhile(node, scope)
				return
			case 'DoWhileStatement':
				yield* this.executeDoWhile(node, scope)
				return
			case 'ForOfStatement':
				yield* this.executeForOf(node, scope)
				return
			case 'ForInStatement':
				yield* this.executeForIn(node, scope)
				return
			case 'SwitchStatement':
				yield* this.executeSwitch(node, scope)
				return
			case 'TryStatement':
				yield* this.executeTry(node, scope)
				return
			case 'LabeledStatement':
				yield* this.executeLabeled(node, scope)
				return
			default:
				throw new InterpreterError(`Unsupported syntax: ${node.type}`)
		}
	}

	private *executeLabelable(
		node: acorn.Statement,
		scope: Scope,
		label: string,
	): Gen<void> {
		switch (node.type) {
			case 'ForStatement':
				yield* this.executeFor(node, scope, label)
				return
			case 'WhileStatement':
				yield* this.executeWhile(node, scope, label)
				return
			case 'DoWhileStatement':
				yield* this.executeDoWhile(node, scope, label)
				return
			case 'ForOfStatement':
				yield* this.executeForOf(node, scope, label)
				return
			case 'ForInStatement':
				yield* this.executeForIn(node, scope, label)
				return
			default:
				yield* this.execute(node, scope)
		}
	}

	private *executeLabeled(
		node: acorn.LabeledStatement,
		scope: Scope,
	): Gen<void> {
		const label = node.label.name
		try {
			yield* this.executeLabelable(node.body, scope, label)
		} catch (err) {
			if (err instanceof BreakSignal && err.label === label) return
			throw err
		}
	}

	private matchesBreak(err: unknown, ownLabel?: string): err is BreakSignal {
		return err instanceof BreakSignal && (!err.label || err.label === ownLabel)
	}

	private matchesContinue(
		err: unknown,
		ownLabel?: string,
	): err is ContinueSignal {
		return (
			err instanceof ContinueSignal && (!err.label || err.label === ownLabel)
		)
	}

	private *runLoopBody(
		body: acorn.Statement,
		scope: Scope,
		ownLabel?: string,
	): Gen<'continue' | 'break'> {
		try {
			yield* this.execute(body, scope)
		} catch (err) {
			if (this.matchesBreak(err, ownLabel)) return 'break'
			if (this.matchesContinue(err, ownLabel)) return 'continue'
			throw err
		}
		return 'continue'
	}

	private *executeFor(
		node: acorn.ForStatement,
		scope: Scope,
		ownLabel?: string,
	): Gen<void> {
		let iterScope = scope.child()
		if (node.init) {
			if (node.init.type === 'VariableDeclaration') {
				yield* this.execute(node.init, iterScope)
			} else {
				yield* this.evaluate(node.init, iterScope)
			}
		}
		const isLexical =
			node.init?.type === 'VariableDeclaration' && node.init.kind !== 'var'
		const loopVarNames = isLexical
			? (node.init as acorn.VariableDeclaration).declarations
					.filter((d) => d.id.type === 'Identifier')
					.map((d) => (d.id as acorn.Identifier).name)
			: []

		while (true) {
			if (node.test) {
				if (!this.truthy(yield* this.evaluate(node.test, iterScope))) break
			}
			const outcome = yield* this.runLoopBody(
				node.body,
				iterScope.child(),
				ownLabel,
			)
			if (outcome === 'break') break
			if (isLexical) {
				const next = scope.child()
				for (const name of loopVarNames) {
					next.declare(name, iterScope.get(name), 'let')
				}
				iterScope = next
			}
			if (node.update) yield* this.evaluate(node.update, iterScope)
		}
	}

	private *executeWhile(
		node: acorn.WhileStatement,
		scope: Scope,
		ownLabel?: string,
	): Gen<void> {
		while (this.truthy(yield* this.evaluate(node.test, scope))) {
			const outcome = yield* this.runLoopBody(
				node.body,
				scope.child(),
				ownLabel,
			)
			if (outcome === 'break') break
		}
	}

	private *executeDoWhile(
		node: acorn.DoWhileStatement,
		scope: Scope,
		ownLabel?: string,
	): Gen<void> {
		do {
			const outcome = yield* this.runLoopBody(
				node.body,
				scope.child(),
				ownLabel,
			)
			if (outcome === 'break') break
		} while (this.truthy(yield* this.evaluate(node.test, scope)))
	}

	private toIterable(value: Value): Iterable<Value> {
		if (Array.isArray(value)) return value
		if (typeof value === 'string') return value
		if (value instanceof Map || value instanceof Set) return value
		if (isInterpretedGenerator(value)) return this.generatorIterable(value)
		if (
			value &&
			typeof value === 'object' &&
			typeof (value as Iterable<Value>)[Symbol.iterator] === 'function'
		) {
			return value as Iterable<Value>
		}
		throw new InterpreterError(`${stringifyValue(value)} is not iterable`)
	}

	private generatorIterable(genObj: InterpretedGenerator): Iterable<Value> {
		return {
			[Symbol.iterator]: () => ({
				next: (v?: Value) => {
					const { value, done } = this.advanceGenerator(
						genObj,
						v,
						'next',
						undefined,
					)
					return { value, done }
				},
			}),
		}
	}

	private *bindForTarget(
		left: acorn.VariableDeclaration | acorn.Pattern,
		value: Value,
		scope: Scope,
	): Gen<void> {
		if (left.type === 'VariableDeclaration') {
			const kind =
				left.kind === 'var' || left.kind === 'let' ? left.kind : 'const'
			yield* this.bindPattern(left.declarations[0].id, value, scope, kind)
			return
		}
		yield* this.assignToTarget(left, value, scope)
	}

	private *executeForOf(
		node: acorn.ForOfStatement,
		scope: Scope,
		ownLabel?: string,
	): Gen<void> {
		const iterableValue = yield* this.evaluate(node.right, scope)
		for (const item of this.toIterable(iterableValue)) {
			const resolved = node.await ? yield item : item
			const iterScope = scope.child()
			yield* this.bindForTarget(node.left, resolved, iterScope)
			const outcome = yield* this.runLoopBody(node.body, iterScope, ownLabel)
			if (outcome === 'break') break
		}
	}

	private *executeForIn(
		node: acorn.ForInStatement,
		scope: Scope,
		ownLabel?: string,
	): Gen<void> {
		const objectValue = yield* this.evaluate(node.right, scope)
		if (objectValue === null || objectValue === undefined) return
		const keys: string[] = Array.isArray(objectValue)
			? objectValue.map((_, i) => String(i))
			: Object.keys(objectValue as object)
		for (const key of keys) {
			const iterScope = scope.child()
			yield* this.bindForTarget(node.left, key, iterScope)
			const outcome = yield* this.runLoopBody(node.body, iterScope, ownLabel)
			if (outcome === 'break') break
		}
	}

	private *executeSwitch(node: acorn.SwitchStatement, scope: Scope): Gen<void> {
		const discriminant = yield* this.evaluate(node.discriminant, scope)
		const switchScope = scope.child()
		let matchIndex = -1
		let defaultIndex = -1
		for (let i = 0; i < node.cases.length; i++) {
			const c = node.cases[i]
			if (c.test === null) {
				defaultIndex = i
				continue
			}
			const testValue = yield* this.evaluate(
				c.test as acorn.Expression,
				switchScope,
			)
			if (testValue === discriminant) {
				matchIndex = i
				break
			}
		}
		const startIndex = matchIndex !== -1 ? matchIndex : defaultIndex
		if (startIndex === -1) return
		try {
			for (let i = startIndex; i < node.cases.length; i++) {
				yield* this.executeStatements(node.cases[i].consequent, switchScope)
			}
		} catch (err) {
			if (!this.matchesBreak(err)) throw err
		}
	}

	private errorToValue(err: unknown): Value {
		if (err instanceof ThrownValue) return err.value
		if (err instanceof Error) return err
		return err
	}

	private *executeTry(node: acorn.TryStatement, scope: Scope): Gen<void> {
		try {
			try {
				yield* this.execute(node.block, scope.child())
			} catch (err) {
				if (isControlSignal(err) || !node.handler) throw err
				const catchScope = scope.child()
				if (node.handler.param) {
					yield* this.bindPattern(
						node.handler.param,
						this.errorToValue(err),
						catchScope,
						'let',
					)
				}
				yield* this.execute(node.handler.body, catchScope)
			}
		} finally {
			if (node.finalizer) yield* this.execute(node.finalizer, scope.child())
		}
	}

	// ---------------------------------------------------------------------
	// Destructuring / assignment targets
	// ---------------------------------------------------------------------

	private toArrayForDestructuring(value: Value): Value[] {
		if (Array.isArray(value)) return value
		if (typeof value === 'string') return [...value]
		if (isInterpretedGenerator(value)) {
			return [...this.generatorIterable(value)]
		}
		if (
			value &&
			typeof value === 'object' &&
			typeof (value as Iterable<Value>)[Symbol.iterator] === 'function'
		) {
			return [...(value as Iterable<Value>)]
		}
		throw new InterpreterError(`${stringifyValue(value)} is not iterable`)
	}

	private *bindPattern(
		pattern: acorn.Pattern,
		value: Value,
		scope: Scope,
		kind: 'let' | 'const' | 'var' | 'assign',
	): Gen<void> {
		switch (pattern.type) {
			case 'Identifier':
				if (kind === 'assign') scope.set(pattern.name, value)
				else scope.declare(pattern.name, value, kind)
				return
			case 'AssignmentPattern': {
				const resolved =
					value === undefined
						? yield* this.evaluate(pattern.right, scope)
						: value
				yield* this.bindPattern(pattern.left, resolved, scope, kind)
				return
			}
			case 'RestElement':
				yield* this.bindPattern(pattern.argument, value, scope, kind)
				return
			case 'ArrayPattern': {
				const items = this.toArrayForDestructuring(value)
				let i = 0
				for (const el of pattern.elements) {
					if (!el) {
						i++
						continue
					}
					if (el.type === 'RestElement') {
						yield* this.bindPattern(el.argument, items.slice(i), scope, kind)
						break
					}
					yield* this.bindPattern(el, items[i], scope, kind)
					i++
				}
				return
			}
			case 'ObjectPattern': {
				const usedKeys: string[] = []
				for (const prop of pattern.properties) {
					if (prop.type === 'RestElement') {
						const rest: Record<string, Value> = {}
						if (value && typeof value === 'object') {
							for (const k of Object.keys(value as object)) {
								if (!usedKeys.includes(k)) {
									rest[k] = (value as Record<string, Value>)[k]
								}
							}
						}
						yield* this.bindPattern(prop.argument, rest, scope, kind)
						continue
					}
					const key = prop.computed
						? String(yield* this.evaluate(prop.key as acorn.Expression, scope))
						: prop.key.type === 'Identifier'
							? prop.key.name
							: String((prop.key as acorn.Literal).value)
					usedKeys.push(key)
					const propValue =
						value === null || value === undefined
							? undefined
							: (value as Record<string, Value>)[key]
					yield* this.bindPattern(
						prop.value as acorn.Pattern,
						propValue,
						scope,
						kind,
					)
				}
				return
			}
			case 'MemberExpression':
				yield* this.assignToTarget(pattern, value, scope)
				return
			default:
				throw new InterpreterError(
					`Unsupported syntax: destructuring target ${(pattern as acorn.Node).type}`,
				)
		}
	}

	private *assignToTarget(
		target: acorn.Pattern,
		value: Value,
		scope: Scope,
	): Gen<void> {
		if (target.type === 'Identifier') {
			scope.set(target.name, value)
			return
		}
		if (target.type === 'MemberExpression') {
			if (target.object.type === 'Super') {
				throw new InterpreterError('Unsupported syntax: super assignment')
			}
			const objectValue = yield* this.evaluate(target.object, scope)
			if (objectValue === null || objectValue === undefined) {
				throw new InterpreterError(
					`Cannot set properties of ${String(objectValue)}`,
				)
			}
			const key = target.computed
				? String(
						yield* this.evaluate(target.property as acorn.Expression, scope),
					)
				: memberPropertyKey(target.property)
			if (isInterpretedClass(objectValue)) objectValue.staticProps[key] = value
			else (objectValue as Record<string, Value>)[key] = value
			return
		}
		if (target.type === 'ArrayPattern' || target.type === 'ObjectPattern') {
			yield* this.bindPattern(target, value, scope, 'assign')
			return
		}
		throw new InterpreterError(
			`Unsupported syntax: assignment target ${target.type}`,
		)
	}

	// ---------------------------------------------------------------------
	// Expressions
	// ---------------------------------------------------------------------

	private *evaluate(node: acorn.Expression, scope: Scope): Gen<Value> {
		switch (node.type) {
			case 'Literal':
				if ('regex' in node && node.regex) {
					return new RegExp(node.regex.pattern, node.regex.flags)
				}
				return node.value as Value
			case 'Identifier':
				return node.name === 'undefined' ? undefined : scope.get(node.name)
			case 'ThisExpression':
				return scope.has('this') ? scope.get('this') : undefined
			case 'TemplateLiteral':
				return yield* this.evaluateTemplateLiteral(node, scope)
			case 'ArrayExpression':
				return yield* this.evaluateArray(node, scope)
			case 'ObjectExpression':
				return yield* this.evaluateObject(node, scope)
			case 'BinaryExpression':
				return yield* this.evaluateBinary(node, scope)
			case 'LogicalExpression':
				return yield* this.evaluateLogical(node, scope)
			case 'UnaryExpression':
				return yield* this.evaluateUnary(node, scope)
			case 'UpdateExpression':
				return yield* this.evaluateUpdate(node, scope)
			case 'ConditionalExpression':
				return this.truthy(yield* this.evaluate(node.test, scope))
					? yield* this.evaluate(node.consequent, scope)
					: yield* this.evaluate(node.alternate, scope)
			case 'SequenceExpression': {
				let result: Value
				for (const expr of node.expressions) {
					result = yield* this.evaluate(expr, scope)
				}
				return result
			}
			case 'AssignmentExpression':
				return yield* this.evaluateAssignment(node, scope)
			case 'ArrowFunctionExpression':
				return this.makeFunction(node, scope, true)
			case 'FunctionExpression':
				return this.makeFunction(node, scope, false)
			case 'ClassExpression':
				return yield* this.evaluateClass(node, scope)
			case 'CallExpression':
				return yield* this.evaluateCall(node, scope)
			case 'NewExpression':
				return yield* this.evaluateNew(node, scope)
			case 'MemberExpression':
				return yield* this.evaluateMember(node, scope)
			case 'ChainExpression': {
				const result = yield* this.evaluate(node.expression, scope)
				return result === OPTIONAL_SKIP ? undefined : result
			}
			case 'AwaitExpression': {
				const awaited = yield* this.evaluate(node.argument, scope)
				return yield awaited
			}
			case 'YieldExpression': {
				const value = node.argument
					? yield* this.evaluate(node.argument, scope)
					: undefined
				if (node.delegate) {
					let sent: Value = undefined
					for (const item of this.toIterable(value)) {
						sent = yield item
					}
					return sent
				}
				return yield value
			}
			default:
				throw new InterpreterError(`Unsupported syntax: ${node.type}`)
		}
	}

	private *evaluateTemplateLiteral(
		node: acorn.TemplateLiteral,
		scope: Scope,
	): Gen<string> {
		let result = ''
		for (let i = 0; i < node.quasis.length; i++) {
			result += node.quasis[i].value.cooked ?? node.quasis[i].value.raw
			const expression = node.expressions[i]
			if (expression) {
				result += stringifyValue(yield* this.evaluate(expression, scope))
			}
		}
		return result
	}

	private *evaluateArray(
		node: acorn.ArrayExpression,
		scope: Scope,
	): Gen<Value[]> {
		const result: Value[] = []
		for (const el of node.elements) {
			if (!el) {
				result.push(undefined)
				continue
			}
			if (el.type === 'SpreadElement') {
				const spread = yield* this.evaluate(el.argument, scope)
				result.push(...this.toArrayForDestructuring(spread))
				continue
			}
			result.push(yield* this.evaluate(el, scope))
		}
		return result
	}

	private *evaluateObject(
		node: acorn.ObjectExpression,
		scope: Scope,
	): Gen<Record<string, Value>> {
		const obj: Record<string, Value> = {}
		for (const prop of node.properties) {
			if (prop.type === 'SpreadElement') {
				const spread = yield* this.evaluate(prop.argument, scope)
				if (spread && typeof spread === 'object') {
					Object.assign(obj, spread)
				}
				continue
			}
			let key: string
			if (prop.computed) {
				key = String(yield* this.evaluate(prop.key as acorn.Expression, scope))
			} else if (prop.key.type === 'Identifier') {
				key = prop.key.name
			} else if (prop.key.type === 'Literal') {
				key = String(prop.key.value)
			} else {
				throw new InterpreterError('Unsupported syntax: object key')
			}
			if (prop.kind === 'get' || prop.kind === 'set') {
				const fn = this.makeFunction(
					prop.value as acorn.FunctionExpression,
					scope,
					false,
				)
				const existing = Object.getOwnPropertyDescriptor(obj, key)
				Object.defineProperty(obj, key, {
					configurable: true,
					enumerable: true,
					...this.makeAccessorPair(fn, key, prop.kind, existing),
				})
				continue
			}
			obj[key] = yield* this.evaluate(prop.value as acorn.Expression, scope)
		}
		return obj
	}

	private *evaluateBinary(
		node: acorn.BinaryExpression,
		scope: Scope,
	): Gen<Value> {
		if (node.left.type === 'PrivateIdentifier') {
			const obj = yield* this.evaluate(node.right as acorn.Expression, scope)
			return `#${node.left.name}` in (obj as object)
		}
		if (node.operator === 'in') {
			const key = yield* this.evaluate(node.left, scope)
			const obj = yield* this.evaluate(node.right as acorn.Expression, scope)
			return String(key) in (obj as object)
		}
		if (node.operator === 'instanceof') {
			const value = yield* this.evaluate(node.left, scope)
			const ctor = yield* this.evaluate(node.right as acorn.Expression, scope)
			return this.evaluateInstanceof(value, ctor)
		}
		const leftValue = yield* this.evaluate(node.left, scope)
		const rightValue = yield* this.evaluate(
			node.right as acorn.Expression,
			scope,
		)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const l = leftValue as any
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const r = rightValue as any
		switch (node.operator) {
			case '+':
				return l + r
			case '-':
				return l - r
			case '*':
				return l * r
			case '/':
				return l / r
			case '%':
				return l % r
			case '**':
				return l ** r
			case '==':
				return l == r
			case '!=':
				return l != r
			case '===':
				return l === r
			case '!==':
				return l !== r
			case '<':
				return l < r
			case '>':
				return l > r
			case '<=':
				return l <= r
			case '>=':
				return l >= r
			case '&':
				return l & r
			case '|':
				return l | r
			case '^':
				return l ^ r
			case '<<':
				return l << r
			case '>>':
				return l >> r
			case '>>>':
				return l >>> r
			default:
				throw new InterpreterError(`Unsupported operator: ${node.operator}`)
		}
	}

	private evaluateInstanceof(value: Value, ctor: Value): boolean {
		if (isInterpretedClass(ctor)) {
			if (!value || typeof value !== 'object') return false
			let proto: object | null = Object.getPrototypeOf(value)
			while (proto) {
				if (proto === ctor.prototype) return true
				proto = Object.getPrototypeOf(proto)
			}
			return false
		}
		if (typeof ctor === 'function') {
			return value instanceof (ctor as new (...args: unknown[]) => object)
		}
		throw new InterpreterError('Right-hand side of instanceof is not callable')
	}

	private *evaluateLogical(
		node: acorn.LogicalExpression,
		scope: Scope,
	): Gen<Value> {
		const left = yield* this.evaluate(node.left, scope)
		switch (node.operator) {
			case '&&':
				return this.truthy(left)
					? yield* this.evaluate(node.right, scope)
					: left
			case '||':
				return this.truthy(left)
					? left
					: yield* this.evaluate(node.right, scope)
			case '??':
				return left === null || left === undefined
					? yield* this.evaluate(node.right, scope)
					: left
			default:
				throw new InterpreterError(`Unsupported operator: ${node.operator}`)
		}
	}

	private *evaluateUnary(
		node: acorn.UnaryExpression,
		scope: Scope,
	): Gen<Value> {
		if (
			node.operator === 'typeof' &&
			node.argument.type === 'Identifier' &&
			!scope.has(node.argument.name)
		) {
			return 'undefined'
		}
		if (node.operator === 'delete') {
			if (
				node.argument.type === 'MemberExpression' &&
				node.argument.object.type !== 'Super'
			) {
				const objectValue = yield* this.evaluate(node.argument.object, scope)
				if (objectValue && typeof objectValue === 'object') {
					const key = node.argument.computed
						? String(
								yield* this.evaluate(
									node.argument.property as acorn.Expression,
									scope,
								),
							)
						: memberPropertyKey(node.argument.property)
					delete (objectValue as Record<string, Value>)[key]
				}
			}
			return true
		}
		const value = yield* this.evaluate(node.argument, scope)
		switch (node.operator) {
			case '!':
				return !this.truthy(value)
			case '-':
				return -(value as number)
			case '+':
				return +(value as number)
			case '~':
				return ~(value as number)
			case 'typeof':
				return typeof value
			case 'void':
				return undefined
			default:
				throw new InterpreterError(`Unsupported operator: ${node.operator}`)
		}
	}

	private *evaluateUpdate(
		node: acorn.UpdateExpression,
		scope: Scope,
	): Gen<Value> {
		const delta = node.operator === '++' ? 1 : -1
		if (node.argument.type === 'Identifier') {
			const old = Number(yield* this.evaluate(node.argument, scope))
			const next = old + delta
			scope.set(node.argument.name, next)
			return node.prefix ? next : old
		}
		if (
			node.argument.type === 'MemberExpression' &&
			node.argument.object.type !== 'Super'
		) {
			const objectValue = yield* this.evaluate(node.argument.object, scope)
			const key = node.argument.computed
				? String(
						yield* this.evaluate(
							node.argument.property as acorn.Expression,
							scope,
						),
					)
				: memberPropertyKey(node.argument.property)
			const bag = isInterpretedClass(objectValue)
				? objectValue.staticProps
				: (objectValue as Record<string, Value>)
			const old = Number(bag[key])
			const next = old + delta
			bag[key] = next
			return node.prefix ? next : old
		}
		throw new InterpreterError('Unsupported syntax: update expression target')
	}

	private applyCompoundOp(operator: string, left: Value, right: Value): Value {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const l = left as any
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const r = right as any
		switch (operator) {
			case '+=':
				return l + r
			case '-=':
				return l - r
			case '*=':
				return l * r
			case '/=':
				return l / r
			case '%=':
				return l % r
			case '**=':
				return l ** r
			case '&=':
				return l & r
			case '|=':
				return l | r
			case '^=':
				return l ^ r
			case '<<=':
				return l << r
			case '>>=':
				return l >> r
			case '>>>=':
				return l >>> r
			default:
				throw new InterpreterError(`Unsupported operator: ${operator}`)
		}
	}

	private *evaluateAssignment(
		node: acorn.AssignmentExpression,
		scope: Scope,
	): Gen<Value> {
		if (node.operator === '=') {
			const value = yield* this.evaluate(node.right, scope)
			yield* this.assignToTarget(node.left as acorn.Pattern, value, scope)
			return value
		}
		if (
			node.operator === '&&=' ||
			node.operator === '||=' ||
			node.operator === '??='
		) {
			const current = yield* this.evaluate(node.left as acorn.Expression, scope)
			const shouldAssign =
				node.operator === '&&='
					? this.truthy(current)
					: node.operator === '||='
						? !this.truthy(current)
						: current === null || current === undefined
			if (!shouldAssign) return current
			const value = yield* this.evaluate(node.right, scope)
			yield* this.assignToTarget(node.left as acorn.Pattern, value, scope)
			return value
		}
		if (
			node.left.type !== 'Identifier' &&
			node.left.type !== 'MemberExpression'
		) {
			throw new InterpreterError(
				'Unsupported syntax: compound assignment target',
			)
		}
		const current = yield* this.evaluate(node.left as acorn.Expression, scope)
		const rightValue = yield* this.evaluate(node.right, scope)
		const newValue = this.applyCompoundOp(node.operator, current, rightValue)
		yield* this.assignToTarget(node.left as acorn.Pattern, newValue, scope)
		return newValue
	}

	private *evaluateMember(
		node: acorn.MemberExpression,
		scope: Scope,
	): Gen<Value> {
		if (node.object.type === 'Super') {
			const frame = this.homeStack[this.homeStack.length - 1]
			if (!frame) throw new InterpreterError("'super' outside a method")
			const parentProto = Object.getPrototypeOf(frame.cls.prototype)
			const key = node.computed
				? String(yield* this.evaluate(node.property as acorn.Expression, scope))
				: memberPropertyKey(node.property)
			return parentProto
				? (parentProto as Record<string, Value>)[key]
				: undefined
		}
		const objectValue = yield* this.evaluate(node.object, scope)
		if (objectValue === OPTIONAL_SKIP) return OPTIONAL_SKIP as unknown as Value
		if (node.optional && (objectValue === null || objectValue === undefined)) {
			return OPTIONAL_SKIP as unknown as Value
		}
		if (objectValue === null || objectValue === undefined) {
			throw new InterpreterError(
				`Cannot read properties of ${String(objectValue)}`,
			)
		}
		const key = node.computed
			? String(yield* this.evaluate(node.property as acorn.Expression, scope))
			: memberPropertyKey(node.property)
		if (isInterpretedClass(objectValue))
			return this.getStaticMember(objectValue, key)
		return (objectValue as Record<string, Value>)[key]
	}

	private getStaticMember(cls: InterpretedClass, key: string): Value {
		let current: InterpretedClass | null = cls
		while (current) {
			if (key in current.staticProps) return current.staticProps[key]
			current = current.superClass
		}
		if (cls.nativeSuper)
			return (cls.nativeSuper as unknown as Record<string, Value>)[key]
		if (key === 'name') return cls.name
		return undefined
	}

	// ---------------------------------------------------------------------
	// Functions
	// ---------------------------------------------------------------------

	private makeFunction(
		node: acorn.Function,
		closure: Scope,
		isArrow: boolean,
	): InterpretedFunction {
		const isGenerator = 'generator' in node && Boolean(node.generator)
		if (Boolean(node.async) && isGenerator) {
			throw new InterpreterError(
				'Unsupported syntax: async generator functions',
			)
		}
		const fn: InterpretedFunction = {
			__interpretedFunction: true,
			name: node.id?.name ?? '',
			params: node.params,
			body: node.body,
			closure,
			isArrow,
			isAsync: Boolean(node.async),
			isGenerator,
		}
		if (!isArrow && node.id) {
			const selfScope = closure.child()
			selfScope.declare(node.id.name, fn, 'const')
			fn.closure = selfScope
		}
		return fn
	}

	private *bindParams(
		params: acorn.Pattern[],
		args: Value[],
		scope: Scope,
	): Gen<void> {
		for (let i = 0; i < params.length; i++) {
			const param = params[i]
			if (param.type === 'RestElement') {
				yield* this.bindPattern(param.argument, args.slice(i), scope, 'var')
				return
			}
			yield* this.bindPattern(param, args[i], scope, 'var')
		}
	}

	private toNativeCallable(
		fn: InterpretedFunction,
	): (...args: unknown[]) => unknown {
		return (...args: unknown[]) =>
			this.driveSync(
				this.invokeFunctionBody(
					fn,
					args as Value[],
					undefined,
					undefined,
					fn.name,
				),
			)
	}

	/** Builds a real `get`/`set` accessor pair backed by an interpreted
	 * function, using a plain (non-arrow) function so the native property
	 * access supplies the correct receiver as `this`. */
	private makeAccessorPair(
		fn: InterpretedFunction,
		key: string,
		kind: 'get' | 'set',
		existing: PropertyDescriptor | undefined,
	): { get?: () => Value; set?: (v: Value) => void } {
		const invoke = (args: Value[], receiver: Value) =>
			this.driveSync(
				this.invokeFunctionBody(fn, args, receiver, undefined, key),
			)
		return {
			get:
				kind === 'get'
					? function (this: Value) {
							return invoke([], this)
						}
					: existing?.get,
			set:
				kind === 'set'
					? function (this: Value, v: Value) {
							invoke([v], this)
						}
					: existing?.set,
		}
	}

	private wrapForNative(value: Value): unknown {
		return isInterpretedFunction(value) ? this.toNativeCallable(value) : value
	}

	private callNative(
		fn: (...args: unknown[]) => unknown,
		thisArg: Value,
		args: Value[],
	): Value {
		const wrapped = args.map((a) => this.wrapForNative(a))
		return Reflect.apply(fn, thisArg, wrapped) as Value
	}

	/** Runs an interpreted function's body to completion (sync) or up to
	 * its first `await` (async), where the caller decides how to drive it. */
	private *invokeFunctionBody(
		fn: InterpretedFunction,
		args: Value[],
		thisArg: Value,
		_line: number | undefined,
		_displayName: string,
	): Gen<Value> {
		const callScope = fn.closure.child()
		if (!fn.isArrow) callScope.declare('this', thisArg, 'const')
		yield* this.bindParams(fn.params, args, callScope)

		if (fn.homeClass)
			this.homeStack.push({ instance: thisArg, cls: fn.homeClass })
		try {
			if (fn.isArrow && fn.body.type !== 'BlockStatement') {
				return yield* this.evaluate(fn.body as acorn.Expression, callScope)
			}
			try {
				yield* this.executeStatements(
					(fn.body as acorn.BlockStatement).body,
					callScope,
				)
				return undefined
			} catch (signal) {
				if (signal instanceof ReturnSignal) return signal.value
				throw signal
			}
		} finally {
			if (fn.homeClass) this.homeStack.pop()
		}
	}

	private callFunction(
		fn: Value,
		args: Value[],
		line: number | undefined,
		displayName?: string,
		thisArg?: Value,
	): Value {
		if (!isInterpretedFunction(fn)) {
			throw new InterpreterError(`${displayName ?? 'value'} is not a function`)
		}
		this.callBudget -= 1
		if (this.callBudget <= 0) {
			throw new InterpreterError(
				'Execution aborted: too many function calls (possible infinite recursion)',
			)
		}
		const name = displayName || fn.name || 'anonymous'

		if (fn.isGenerator) {
			return this.makeGeneratorObject(fn, args, thisArg, line, name)
		}

		if (fn.isAsync) {
			return this.runAsyncFunction(fn, args, thisArg, line, name)
		}

		this.trace.pushCall(name, line)
		this.trace.push(
			'function-call',
			`Called ${name}() - added to call stack`,
			line,
		)
		const result = this.driveSync(
			this.invokeFunctionBody(fn, args, thisArg, line, name),
		)
		this.trace.popCall()
		this.trace.push(
			'function-return',
			`${name}() completed - removed from call stack`,
			line,
		)
		return result
	}

	private runAsyncFunction(
		fn: InterpretedFunction,
		args: Value[],
		thisArg: Value,
		line: number | undefined,
		name: string,
	): SimulatedPromise {
		const gen = this.invokeFunctionBody(fn, args, thisArg, line, name)
		const resultPromise = new SimulatedPromise(this.scheduler)

		const advance = (isInitial: boolean, input: Value, isThrow: boolean) => {
			this.trace.pushCall(name, line)
			this.trace.push(
				'function-call',
				isInitial
					? `Called ${name}() - added to call stack`
					: `Resumed ${name}() after await - added to call stack`,
				line,
			)

			let res: IteratorResult<Value, Value>
			try {
				res = isThrow ? gen.throw(input) : gen.next(input)
			} catch (err) {
				this.trace.popCall()
				this.trace.push(
					'function-return',
					`${name}() threw - removed from call stack`,
					line,
				)
				resultPromise.reject(
					err instanceof ThrownValue ? err.value : this.errorToValue(err),
				)
				return
			}

			if (res.done) {
				this.trace.popCall()
				this.trace.push(
					'function-return',
					`${name}() completed - removed from call stack`,
					line,
				)
				resultPromise.resolve(res.value)
				return
			}

			this.trace.popCall()
			this.trace.push(
				'function-return',
				`${name}() suspended at await - removed from call stack`,
				line,
			)

			const awaited = res.value
			const resume = (value: Value, threw: boolean) => {
				const callbackItem: CallbackQueueItem = {
					id: this.trace.generateId(),
					name: `Resume ${name}() after await`,
					type: 'promise',
					delay: 0,
					lineNumber: line,
				}
				this.trace.callbackQueue.unshift(callbackItem)
				this.trace.push(
					'callback-queue',
					'Microtask ready - continuation moved to microtask queue',
					line,
				)
				const idx = this.trace.callbackQueue.findIndex(
					(c) => c.id === callbackItem.id,
				)
				if (idx >= 0) this.trace.callbackQueue.splice(idx, 1)
				this.runInContext('microtask queue', () => advance(false, value, threw))
			}

			if (awaited instanceof SimulatedPromise) {
				awaited.registerReaction(
					(v) => resume(v, false),
					(r) => resume(r, true),
				)
			} else {
				this.scheduler.enqueueMicrotask(() => resume(awaited, false))
			}
		}

		advance(true, undefined, false)
		return resultPromise
	}

	private makeGeneratorObject(
		fn: InterpretedFunction,
		args: Value[],
		thisArg: Value,
		line: number | undefined,
		name: string,
	): InterpretedGenerator {
		const gen = this.invokeFunctionBody(fn, args, thisArg, line, name)
		return { __interpretedGenerator: true, name, gen, done: false }
	}

	private advanceGenerator(
		genObj: InterpretedGenerator,
		input: Value,
		mode: 'next' | 'throw' | 'return',
		line: number | undefined,
	): { value: Value; done: boolean } {
		if (genObj.done || !genObj.gen) {
			return { value: mode === 'return' ? input : undefined, done: true }
		}
		const name = genObj.name || 'anonymous'
		this.trace.pushCall(name, line)
		this.trace.push(
			'function-call',
			mode === 'next'
				? `Resumed ${name}() at yield - added to call stack`
				: mode === 'throw'
					? `Threw into ${name}() - added to call stack`
					: `Returned into ${name}() - added to call stack`,
			line,
		)

		let res: IteratorResult<Value, Value>
		try {
			res =
				mode === 'throw'
					? genObj.gen.throw(new ThrownValue(input))
					: mode === 'return'
						? (genObj.gen.return(input) as IteratorResult<Value, Value>)
						: genObj.gen.next(input)
		} catch (err) {
			genObj.done = true
			genObj.gen = null
			this.trace.popCall()
			this.trace.push(
				'function-return',
				`${name}() threw - removed from call stack`,
				line,
			)
			throw err instanceof ThrownValue
				? err
				: new ThrownValue(this.errorToValue(err))
		}

		this.trace.popCall()
		if (res.done) {
			genObj.done = true
			genObj.gen = null
			this.trace.push(
				'function-return',
				`${name}() completed - removed from call stack`,
				line,
			)
		} else {
			this.trace.push(
				'function-return',
				`${name}() suspended at yield - removed from call stack`,
				line,
			)
		}
		return { value: res.value, done: res.done ?? false }
	}

	private *evaluateArgs(
		args: Array<acorn.Expression | acorn.SpreadElement>,
		scope: Scope,
	): Gen<Value[]> {
		const result: Value[] = []
		for (const arg of args) {
			if (arg.type === 'SpreadElement') {
				const spread = yield* this.evaluate(arg.argument, scope)
				result.push(...this.toArrayForDestructuring(spread))
				continue
			}
			result.push(yield* this.evaluate(arg, scope))
		}
		return result
	}

	// ---------------------------------------------------------------------
	// Calls / new
	// ---------------------------------------------------------------------

	private *evaluateCall(node: acorn.CallExpression, scope: Scope): Gen<Value> {
		const callee = node.callee
		const line = this.lineOf(node)

		if (callee.type === 'Super') {
			yield* this.evaluateSuperCall(node, scope, line)
			return undefined
		}

		if (callee.type === 'Identifier') {
			if (callee.name === 'setTimeout')
				return this.builtinSetTimer(node, scope, false)
			if (callee.name === 'setInterval')
				return this.builtinSetTimer(node, scope, true)
			if (callee.name === 'queueMicrotask') {
				return yield* this.builtinQueueMicrotask(node, scope)
			}
			const fnValue = scope.get(callee.name)
			const args = yield* this.evaluateArgs(node.arguments, scope)
			if (isInterpretedFunction(fnValue)) {
				return this.callFunction(fnValue, args, line, callee.name)
			}
			if (typeof fnValue === 'function') {
				return this.callNative(
					fnValue as (...a: unknown[]) => unknown,
					undefined,
					args,
				)
			}
			throw new InterpreterError(`${callee.name} is not a function`)
		}

		if (callee.type === 'MemberExpression') {
			if (callee.object.type === 'Super') {
				return yield* this.evaluateSuperMethodCall(node, callee, scope, line)
			}

			if (
				callee.object.type === 'Identifier' &&
				!callee.computed &&
				callee.property.type === 'Identifier'
			) {
				const objectName = callee.object.name
				const propertyName = callee.property.name
				if (objectName === 'console') {
					return yield* this.builtinConsole(propertyName, node, scope)
				}
				if (objectName === 'Promise') {
					return yield* this.builtinPromiseNamespace(
						propertyName,
						node,
						scope,
						line,
					)
				}
			}

			const objectValue = yield* this.evaluate(callee.object, scope)
			if (objectValue === OPTIONAL_SKIP)
				return OPTIONAL_SKIP as unknown as Value
			if (
				callee.optional &&
				(objectValue === null || objectValue === undefined)
			) {
				return OPTIONAL_SKIP as unknown as Value
			}
			if (objectValue === null || objectValue === undefined) {
				throw new InterpreterError(
					`Cannot read properties of ${String(objectValue)}`,
				)
			}
			const propertyName = callee.computed
				? String(
						yield* this.evaluate(callee.property as acorn.Expression, scope),
					)
				: memberPropertyKey(callee.property)

			if (objectValue instanceof SimulatedPromise) {
				const args = yield* this.evaluateArgs(node.arguments, scope)
				if (propertyName === 'then')
					return this.builtinThen(objectValue, args[0], args[1], line)
				if (propertyName === 'catch')
					return this.builtinThen(objectValue, undefined, args[0], line)
				if (propertyName === 'finally')
					return this.builtinFinally(objectValue, args[0], line)
				throw new InterpreterError(
					`Unsupported syntax: Promise.${propertyName}()`,
				)
			}

			if (isInterpretedGenerator(objectValue)) {
				const args = yield* this.evaluateArgs(node.arguments, scope)
				if (
					propertyName === 'next' ||
					propertyName === 'throw' ||
					propertyName === 'return'
				) {
					const { value, done } = this.advanceGenerator(
						objectValue,
						args[0],
						propertyName,
						line,
					)
					return { value, done }
				}
				throw new InterpreterError(
					`Unsupported syntax: generator.${propertyName}()`,
				)
			}

			const propertyValue = isInterpretedClass(objectValue)
				? this.getStaticMember(objectValue, propertyName)
				: (objectValue as Record<string, Value>)[propertyName]
			if (
				node.optional &&
				(propertyValue === null || propertyValue === undefined)
			) {
				return OPTIONAL_SKIP as unknown as Value
			}
			const args = yield* this.evaluateArgs(node.arguments, scope)
			if (isInterpretedFunction(propertyValue)) {
				return this.callFunction(
					propertyValue,
					args,
					line,
					propertyName,
					objectValue,
				)
			}
			if (typeof propertyValue === 'function') {
				return this.callNative(
					propertyValue as (...a: unknown[]) => unknown,
					objectValue,
					args,
				)
			}
			throw new InterpreterError(`${propertyName} is not a function`)
		}

		const calleeValue = yield* this.evaluate(callee, scope)
		const args = yield* this.evaluateArgs(node.arguments, scope)
		if (isInterpretedFunction(calleeValue))
			return this.callFunction(calleeValue, args, line)
		if (typeof calleeValue === 'function') {
			return this.callNative(
				calleeValue as (...a: unknown[]) => unknown,
				undefined,
				args,
			)
		}
		throw new InterpreterError('Value is not a function')
	}

	private *evaluateNew(node: acorn.NewExpression, scope: Scope): Gen<Value> {
		const line = this.lineOf(node)
		if (node.callee.type === 'Identifier' && node.callee.name === 'Promise') {
			const args = yield* this.evaluateArgs(node.arguments, scope)
			return this.constructPromise(args[0], line)
		}
		const calleeValue = yield* this.evaluate(
			node.callee as acorn.Expression,
			scope,
		)
		const args = yield* this.evaluateArgs(node.arguments, scope)
		if (isInterpretedClass(calleeValue)) {
			return this.constructInstance(calleeValue, args, line)
		}
		if (typeof calleeValue === 'function') {
			return Reflect.construct(
				calleeValue as new (...a: unknown[]) => object,
				args.map((a) => this.wrapForNative(a)),
			)
		}
		throw new InterpreterError('Value is not a constructor')
	}

	// ---------------------------------------------------------------------
	// Classes
	// ---------------------------------------------------------------------

	private memberKeyName(
		node: acorn.MethodDefinition | acorn.PropertyDefinition,
	): string {
		if (node.computed) {
			throw new InterpreterError(
				'Unsupported syntax: computed class member keys are evaluated eagerly and unsupported here',
			)
		}
		if (node.key.type === 'Identifier') return node.key.name
		if (node.key.type === 'PrivateIdentifier') return `#${node.key.name}`
		if (node.key.type === 'Literal') return String(node.key.value)
		throw new InterpreterError('Unsupported syntax: class member key')
	}

	private *evaluateClass(
		node: acorn.Class,
		scope: Scope,
	): Gen<InterpretedClass> {
		const superValue = node.superClass
			? yield* this.evaluate(node.superClass, scope)
			: null

		const classScope = scope.child()
		const cls: InterpretedClass = {
			__interpretedClass: true,
			name: node.id?.name ?? '',
			prototype: {},
			staticProps: {},
			fieldInits: [],
			staticFieldInits: [],
			staticBlocks: [],
			constructorNode: null,
			superClass: null,
			nativeSuper: null,
			classScope,
		}

		if (isInterpretedClass(superValue)) {
			cls.superClass = superValue
			Object.setPrototypeOf(cls.prototype, superValue.prototype)
		} else if (typeof superValue === 'function') {
			cls.nativeSuper = superValue as (...args: unknown[]) => unknown
			Object.setPrototypeOf(
				cls.prototype,
				(superValue as { prototype: object }).prototype,
			)
		}

		if (node.id) classScope.declare(node.id.name, cls, 'const')
		registerClassName(cls.prototype, cls.name)

		for (const member of node.body.body) {
			if (member.type === 'StaticBlock') {
				cls.staticBlocks.push(member)
				continue
			}
			if (member.type === 'MethodDefinition') {
				if (member.kind === 'constructor') {
					cls.constructorNode = member.value
					continue
				}
				const key = this.memberKeyName(member)
				const fn = this.makeFunction(member.value, classScope, false)
				fn.name = key
				fn.homeClass = cls
				const target = member.static ? cls.staticProps : cls.prototype
				if (member.kind === 'get' || member.kind === 'set') {
					const existing = Object.getOwnPropertyDescriptor(target, key)
					Object.defineProperty(target, key, {
						configurable: true,
						enumerable: false,
						...this.makeAccessorPair(fn, key, member.kind, existing),
					})
					continue
				}
				target[key] = fn
				continue
			}
			if (member.type === 'PropertyDefinition') {
				const key = this.memberKeyName(member)
				const field: ClassField = { key, valueNode: member.value ?? null }
				if (member.static) cls.staticFieldInits.push(field)
				else cls.fieldInits.push(field)
				continue
			}
			throw new InterpreterError(
				`Unsupported syntax: class member ${(member as acorn.Node).type}`,
			)
		}

		for (const field of cls.staticFieldInits) {
			const fieldScope = classScope.child()
			fieldScope.declare('this', cls, 'const')
			cls.staticProps[field.key] = field.valueNode
				? yield* this.evaluate(field.valueNode, fieldScope)
				: undefined
		}
		for (const block of cls.staticBlocks) {
			const blockScope = classScope.child()
			blockScope.declare('this', cls, 'const')
			yield* this.executeStatements(block.body, blockScope)
		}

		return cls
	}

	private *runFieldInits(cls: InterpretedClass, instance: Value): Gen<void> {
		const fieldScope = cls.classScope.child()
		fieldScope.declare('this', instance, 'const')
		for (const field of cls.fieldInits) {
			;(instance as Record<string, Value>)[field.key] = field.valueNode
				? yield* this.evaluate(field.valueNode, fieldScope)
				: undefined
		}
	}

	private *runConstructorChain(
		cls: InterpretedClass,
		instance: Value,
		args: Value[],
	): Gen<void> {
		if (!cls.constructorNode) {
			if (cls.superClass) {
				yield* this.runConstructorChain(cls.superClass, instance, args)
			} else if (cls.nativeSuper) {
				const nativeInstance = Reflect.construct(
					cls.nativeSuper as unknown as new (...a: unknown[]) => object,
					args.map((a) => this.wrapForNative(a)),
				)
				Object.assign(instance as object, nativeInstance)
			}
			yield* this.runFieldInits(cls, instance)
			return
		}

		const callScope = cls.classScope.child()
		callScope.declare('this', instance, 'const')
		yield* this.bindParams(cls.constructorNode.params, args, callScope)

		if (!cls.superClass && !cls.nativeSuper) {
			yield* this.runFieldInits(cls, instance)
		}

		this.homeStack.push({ instance, cls })
		try {
			try {
				yield* this.executeStatements(cls.constructorNode.body.body, callScope)
			} catch (err) {
				if (!(err instanceof ReturnSignal)) throw err
			}
		} finally {
			this.homeStack.pop()
		}
	}

	private constructInstance(
		cls: InterpretedClass,
		args: Value[],
		line?: number,
	): Value {
		void line
		const instance = Object.create(cls.prototype)
		this.driveSync(this.runConstructorChain(cls, instance, args))
		return instance
	}

	private *evaluateSuperCall(
		node: acorn.CallExpression,
		scope: Scope,
		line: number | undefined,
	): Gen<void> {
		void line
		const frame = this.homeStack[this.homeStack.length - 1]
		if (!frame) throw new InterpreterError("'super' keyword is unexpected here")
		const args = yield* this.evaluateArgs(node.arguments, scope)
		if (frame.cls.superClass) {
			yield* this.runConstructorChain(
				frame.cls.superClass,
				frame.instance,
				args,
			)
		} else if (frame.cls.nativeSuper) {
			const nativeInstance = Reflect.construct(
				frame.cls.nativeSuper as unknown as new (...a: unknown[]) => object,
				args.map((a) => this.wrapForNative(a)),
			)
			Object.assign(frame.instance as object, nativeInstance)
		}
		yield* this.runFieldInits(frame.cls, frame.instance)
	}

	private *evaluateSuperMethodCall(
		node: acorn.CallExpression,
		callee: acorn.MemberExpression,
		scope: Scope,
		line: number | undefined,
	): Gen<Value> {
		const frame = this.homeStack[this.homeStack.length - 1]
		if (!frame) throw new InterpreterError("'super' keyword is unexpected here")
		const parentProto = Object.getPrototypeOf(frame.cls.prototype)
		const key = callee.computed
			? String(yield* this.evaluate(callee.property as acorn.Expression, scope))
			: (callee.property as acorn.Identifier).name
		const method = parentProto
			? (parentProto as Record<string, Value>)[key]
			: undefined
		const args = yield* this.evaluateArgs(node.arguments, scope)
		if (isInterpretedFunction(method)) {
			return this.callFunction(
				method,
				args,
				line,
				`super.${key}`,
				frame.instance,
			)
		}
		if (typeof method === 'function') {
			return this.callNative(
				method as (...a: unknown[]) => unknown,
				frame.instance,
				args,
			)
		}
		throw new InterpreterError(`super.${key} is not a function`)
	}

	// ---------------------------------------------------------------------
	// Built-ins: console / timers / promises
	// ---------------------------------------------------------------------

	private *builtinConsole(
		method: string,
		node: acorn.CallExpression,
		scope: Scope,
	): Gen<void> {
		const values = yield* this.evaluateArgs(node.arguments, scope)
		const message = values.map(stringifyValue).join(' ')
		const line = this.lineOf(node)
		const logType =
			method === 'error' ? 'error' : method === 'warn' ? 'warn' : 'log'
		const callName = `console.${method}`

		this.trace.pushCall(callName, line)
		this.trace.push(
			'function-call',
			`Called ${callName}(${message}) - added to call stack`,
			line,
			[
				{
					id: this.trace.logId(),
					timestamp: Date.now(),
					message,
					type: logType,
					from: this.executionContext,
				},
			],
		)
		this.trace.popCall()
		this.trace.push(
			'function-return',
			`${callName} executed and removed from call stack`,
			line,
		)
	}

	private *builtinQueueMicrotask(
		node: acorn.CallExpression,
		scope: Scope,
	): Gen<undefined> {
		const args = yield* this.evaluateArgs(node.arguments, scope)
		const fn = args[0]
		const line = this.lineOf(node)
		this.trace.pushCall('queueMicrotask', line)
		this.trace.push(
			'function-call',
			'queueMicrotask() called - added to call stack',
			line,
		)
		this.trace.popCall()
		if (isInterpretedFunction(fn)) {
			this.scheduler.enqueueMicrotask(() =>
				this.runInContext('microtask queue', () =>
					this.callFunction(fn, [], line, 'queueMicrotask callback'),
				),
			)
		}
		return undefined
	}

	private builtinSetTimer(
		node: acorn.CallExpression,
		scope: Scope,
		isInterval: boolean,
	): undefined {
		const args = this.driveSync(this.evaluateArgs(node.arguments, scope))
		const fn = args[0]
		const delay = typeof args[1] === 'number' ? args[1] : 0
		const line = this.lineOf(node)
		const callName = isInterval ? 'setInterval' : 'setTimeout'

		this.trace.pushCall(callName, line)
		this.trace.push(
			'function-call',
			`${callName}() called - added to call stack`,
			line,
		)
		this.trace.popCall()

		const webApiItem: WebAPIItem = {
			id: this.trace.generateId(),
			name: `${callName}(${delay}ms)`,
			type: isInterval ? 'setInterval' : 'setTimeout',
			timeRemaining: delay,
			lineNumber: line,
		}
		this.trace.webAPIs.push(webApiItem)
		this.trace.push(
			'web-api',
			isInterval
				? `setInterval() executed - timer registered with Web APIs (repeats every ${delay}ms)`
				: `setTimeout() executed - timer registered with Web APIs for ${delay}ms`,
			line,
		)

		if (!isInterpretedFunction(fn)) return undefined

		const reps = isInterval ? INTERVAL_REPEAT_COUNT : 1
		for (let rep = 1; rep <= reps; rep++) {
			this.scheduler.enqueueMacrotask(delay * rep, () => {
				this.runTimerCallback(
					fn,
					webApiItem,
					isInterval,
					delay,
					rep,
					reps,
					line,
				)
			})
		}
		return undefined
	}

	private runTimerCallback(
		fn: InterpretedFunction,
		webApiItem: WebAPIItem,
		isInterval: boolean,
		baseDelay: number,
		rep: number,
		totalReps: number,
		line: number | undefined,
	): void {
		if (!isInterval || rep === totalReps) {
			const idx = this.trace.webAPIs.findIndex((w) => w.id === webApiItem.id)
			if (idx >= 0) this.trace.webAPIs.splice(idx, 1)
		}

		const callbackItem: CallbackQueueItem = {
			id: this.trace.generateId(),
			name: isInterval
				? `setInterval callback (firing ${rep})`
				: 'setTimeout callback',
			type: isInterval ? 'interval' : 'timeout',
			delay: baseDelay * rep,
			lineNumber: line,
		}
		this.trace.callbackQueue.push(callbackItem)
		this.trace.push(
			'callback-queue',
			isInterval
				? `Interval fired (every ${baseDelay}ms) - callback moved to callback queue`
				: `Timer completed (${baseDelay}ms) - callback moved to callback queue`,
			line,
		)
		const qIdx = this.trace.callbackQueue.findIndex(
			(c) => c.id === callbackItem.id,
		)
		if (qIdx >= 0) this.trace.callbackQueue.splice(qIdx, 1)

		this.runInContext('callback queue', () =>
			this.callFunction(
				fn,
				[],
				line,
				isInterval ? 'setInterval callback' : 'setTimeout callback',
			),
		)
	}

	private constructPromise(
		executorFn: Value,
		line: number | undefined,
	): SimulatedPromise {
		const promise = new SimulatedPromise(this.scheduler)
		const webApiItem: WebAPIItem = {
			id: this.trace.generateId(),
			name: 'new Promise(executor)',
			type: 'other',
			timeRemaining: 0,
			lineNumber: line,
		}
		this.trace.webAPIs.push(webApiItem)
		this.promiseWebApiItems.set(promise, webApiItem.id)
		this.trace.push(
			'web-api',
			'new Promise() executed - executor registered with Web APIs',
			line,
		)

		if (isInterpretedFunction(executorFn)) {
			const nativeResolve = (value?: Value) => promise.resolve(value)
			const nativeReject = (reason?: Value) => promise.reject(reason)
			try {
				this.callFunction(
					executorFn,
					[nativeResolve, nativeReject],
					line,
					'Promise executor',
				)
			} catch (err) {
				promise.reject(this.errorToValue(err))
			}
		}
		return promise
	}

	private *builtinPromiseNamespace(
		propertyName: string,
		node: acorn.CallExpression,
		scope: Scope,
		line: number | undefined,
	): Gen<Value> {
		if (propertyName === 'resolve')
			return this.builtinPromiseSettle(node, scope, true, line)
		if (propertyName === 'reject')
			return this.builtinPromiseSettle(node, scope, false, line)
		if (propertyName === 'all')
			return yield* this.builtinPromiseCombinator(node, scope, 'all', line)
		if (propertyName === 'race')
			return yield* this.builtinPromiseCombinator(node, scope, 'race', line)
		if (propertyName === 'allSettled') {
			return yield* this.builtinPromiseCombinator(
				node,
				scope,
				'allSettled',
				line,
			)
		}
		throw new InterpreterError(`Unsupported syntax: Promise.${propertyName}()`)
	}

	private builtinPromiseSettle(
		node: acorn.CallExpression,
		scope: Scope,
		isResolve: boolean,
		lineOverride?: number,
	): SimulatedPromise {
		const args = this.driveSync(this.evaluateArgs(node.arguments, scope))
		const value = args[0]
		const line = lineOverride ?? this.lineOf(node)
		const callName = `Promise.${isResolve ? 'resolve' : 'reject'}`

		this.trace.pushCall(callName, line)
		this.trace.push(
			'function-call',
			`${callName}() called - added to call stack`,
			line,
		)
		this.trace.popCall()

		const webApiItem: WebAPIItem = {
			id: this.trace.generateId(),
			name: 'Promise resolution',
			type: 'other',
			timeRemaining: 0,
			lineNumber: line,
		}
		this.trace.webAPIs.push(webApiItem)
		this.trace.push(
			'web-api',
			`${callName}() executed - promise registered with Web APIs`,
			line,
		)

		const promise = new SimulatedPromise(this.scheduler)
		this.promiseWebApiItems.set(promise, webApiItem.id)
		if (isResolve) promise.resolve(value)
		else promise.reject(value)
		return promise
	}

	private *builtinPromiseCombinator(
		node: acorn.CallExpression,
		scope: Scope,
		mode: 'all' | 'race' | 'allSettled',
		line: number | undefined,
	): Gen<SimulatedPromise> {
		const args = yield* this.evaluateArgs(node.arguments, scope)
		const items = this.toArrayForDestructuring(args[0])
		const promises = items.map((item) =>
			item instanceof SimulatedPromise ? item : this.resolvedPromise(item),
		)
		const result = new SimulatedPromise(this.scheduler)

		this.trace.push(
			'web-api',
			`Promise.${mode}() executed - awaiting ${promises.length} promise(s)`,
			line,
		)

		if (promises.length === 0) {
			if (mode === 'all') result.resolve([])
			else if (mode === 'allSettled') result.resolve([])
			return result
		}

		if (mode === 'race') {
			promises.forEach((p) =>
				p.registerReaction(
					(v) => result.resolve(v),
					(r) => result.reject(r),
				),
			)
			return result
		}

		const results: Value[] = new Array(promises.length)
		let remaining = promises.length
		let settled = false
		promises.forEach((p, i) => {
			p.registerReaction(
				(v) => {
					if (settled) return
					results[i] =
						mode === 'allSettled' ? { status: 'fulfilled', value: v } : v
					remaining -= 1
					if (remaining === 0) {
						settled = true
						result.resolve(results)
					}
				},
				(r) => {
					if (settled) return
					if (mode === 'allSettled') {
						results[i] = { status: 'rejected', reason: r }
						remaining -= 1
						if (remaining === 0) {
							settled = true
							result.resolve(results)
						}
						return
					}
					settled = true
					result.reject(r)
				},
			)
		})
		return result
	}

	private resolvedPromise(value: Value): SimulatedPromise {
		const promise = new SimulatedPromise(this.scheduler)
		promise.resolve(value)
		return promise
	}

	private builtinThen(
		promise: SimulatedPromise,
		onFulfilled: Value,
		onRejected: Value,
		line: number | undefined,
	): SimulatedPromise {
		const result = new SimulatedPromise(this.scheduler)
		promise.registerReaction(
			(value) =>
				this.settlePromiseReaction(
					promise,
					result,
					'fulfilled',
					value,
					onFulfilled,
					false,
					line,
				),
			(reason) =>
				this.settlePromiseReaction(
					promise,
					result,
					'rejected',
					reason,
					onRejected,
					false,
					line,
				),
		)
		return result
	}

	private builtinFinally(
		promise: SimulatedPromise,
		fn: Value,
		line: number | undefined,
	): SimulatedPromise {
		const result = new SimulatedPromise(this.scheduler)
		promise.registerReaction(
			(value) =>
				this.settlePromiseReaction(
					promise,
					result,
					'fulfilled',
					value,
					fn,
					true,
					line,
				),
			(reason) =>
				this.settlePromiseReaction(
					promise,
					result,
					'rejected',
					reason,
					fn,
					true,
					line,
				),
		)
		return result
	}

	private settlePromiseReaction(
		promise: SimulatedPromise,
		result: SimulatedPromise,
		mode: 'fulfilled' | 'rejected',
		value: Value,
		handler: Value,
		isFinally: boolean,
		line: number | undefined,
	): void {
		const webApiId = this.promiseWebApiItems.get(promise)
		if (webApiId) {
			const idx = this.trace.webAPIs.findIndex((w) => w.id === webApiId)
			if (idx >= 0) this.trace.webAPIs.splice(idx, 1)
			this.promiseWebApiItems.delete(promise)
		}

		const callbackName = isFinally
			? 'Promise.finally callback'
			: 'Promise.then callback'
		const callbackItem: CallbackQueueItem = {
			id: this.trace.generateId(),
			name: callbackName,
			type: 'promise',
			delay: 0,
			lineNumber: line,
		}
		this.trace.callbackQueue.unshift(callbackItem)
		this.trace.push(
			'callback-queue',
			webApiId
				? 'Promise resolved in Web APIs - callback moved to microtask queue'
				: 'Microtask ready - callback moved to microtask queue',
			line,
		)
		const qIdx = this.trace.callbackQueue.findIndex(
			(c) => c.id === callbackItem.id,
		)
		if (qIdx >= 0) this.trace.callbackQueue.splice(qIdx, 1)

		try {
			this.runInContext('microtask queue', () => {
				if (isFinally) {
					if (isInterpretedFunction(handler)) {
						this.callFunction(handler, [], line, callbackName)
					}
					if (mode === 'fulfilled') result.resolve(value)
					else result.reject(value)
					return
				}
				if (isInterpretedFunction(handler)) {
					const returned = this.callFunction(
						handler,
						[value],
						line,
						callbackName,
					)
					result.resolve(returned)
				} else if (mode === 'fulfilled') {
					result.resolve(value)
				} else {
					result.reject(value)
				}
			})
		} catch (err) {
			result.reject(this.errorToValue(err))
		}
	}
}
