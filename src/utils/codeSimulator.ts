import type { ExecutionStep } from '../types'
import { Interpreter } from './interpreter/interpreter'

export class CodeExecutionSimulator {
	simulateCode(code: string): ExecutionStep[] {
		return new Interpreter().run(code)
	}
}
