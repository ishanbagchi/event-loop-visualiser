import { useEffect, useMemo, useRef, useState } from 'react'
import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
import { useAppStore } from '../store'
import { useShallow } from 'zustand/react/shallow'

type TokenKind = 'keyword' | 'string' | 'number' | 'comment' | 'call'

interface HighlightSegment {
	text: string
	kind?: TokenKind
}

const highlightSegments = (code: string): HighlightSegment[] => {
	type Range = { start: number; end: number; kind: TokenKind }
	const ranges: Range[] = []
	const comments: acorn.Comment[] = []

	try {
		const tokens = [
			...acorn.tokenizer(code, { ecmaVersion: 2022, onComment: comments }),
		]
		comments.forEach((c) =>
			ranges.push({ start: c.start, end: c.end, kind: 'comment' }),
		)
		tokens.forEach((tok, i) => {
			const label = tok.type.label
			if (tok.type.keyword) {
				ranges.push({ start: tok.start, end: tok.end, kind: 'keyword' })
			} else if (
				label === 'string' ||
				label === 'template' ||
				label === 'regexp'
			) {
				ranges.push({ start: tok.start, end: tok.end, kind: 'string' })
			} else if (label === 'num') {
				ranges.push({ start: tok.start, end: tok.end, kind: 'number' })
			} else if (label === 'name' && tokens[i + 1]?.type.label === '(') {
				ranges.push({ start: tok.start, end: tok.end, kind: 'call' })
			}
		})
	} catch {
		return [{ text: code }]
	}

	ranges.sort((a, b) => a.start - b.start)

	const segments: HighlightSegment[] = []
	let cursor = 0
	for (const r of ranges) {
		if (r.start < cursor) continue
		if (r.start > cursor) segments.push({ text: code.slice(cursor, r.start) })
		segments.push({ text: code.slice(r.start, r.end), kind: r.kind })
		cursor = r.end
	}
	if (cursor < code.length) segments.push({ text: code.slice(cursor) })
	return segments
}

const segmentsByLine = (code: string): HighlightSegment[][] => {
	const perLine: HighlightSegment[][] = [[]]
	highlightSegments(code).forEach((seg) => {
		const parts = seg.text.split('\n')
		parts.forEach((part, i) => {
			if (i > 0) perLine.push([])
			if (part.length > 0) {
				perLine[perLine.length - 1].push({ text: part, kind: seg.kind })
			}
		})
	})
	return perLine
}

// Uses the same AST the interpreter executes against (rather than a
// separate line-scanning heuristic) so the highlighted range can never
// disagree with the interpreter's actual step boundaries.
const findBlockEndLine = (code: string, startLine: number): number => {
	let program: acorn.Node
	try {
		program = acorn.parse(code, { ecmaVersion: 2022, locations: true })
	} catch {
		return startLine
	}

	let bestEndLine = startLine
	walk.full(program, (node) => {
		if (!node.loc || node.loc.start.line !== startLine) return
		if (node.loc.end.line > bestEndLine) bestEndLine = node.loc.end.line
	})
	return bestEndLine
}

export const CodeEditor = () => {
	const { code, setCode, currentLine } = useAppStore(
		useShallow((state) => ({
			code: state.code,
			setCode: state.setCode,
			currentLine: state.currentLine,
		})),
	)

	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(code)
	const [error, setError] = useState<string | null>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const pendingCaretRef = useRef<number | null>(null)

	useEffect(() => {
		if (!editing) setDraft(code)
	}, [code, editing])

	useEffect(() => {
		if (!editing) return
		const el = textareaRef.current
		if (!el) return
		el.focus()
		const caret = pendingCaretRef.current
		pendingCaretRef.current = null
		if (caret != null) {
			const pos = Math.max(0, Math.min(caret, el.value.length))
			el.setSelectionRange(pos, pos)
		}
	}, [editing])

	const lines = code.split('\n')
	const blockEndLine =
		currentLine != null ? findBlockEndLine(code, currentLine) : null
	const highlightedLines = useMemo(() => segmentsByLine(code), [code])

	const enterEdit = (caretIndex: number | null = null) => {
		if (editing) return
		setError(null)
		setDraft(code)
		pendingCaretRef.current = caretIndex
		setEditing(true)
	}

	const caretIndexFromPoint = (x: number, y: number): number | null => {
		const doc = document as Document & {
			caretRangeFromPoint?: (x: number, y: number) => Range | null
			caretPositionFromPoint?: (
				x: number,
				y: number,
			) => { offsetNode: Node; offset: number } | null
		}

		let node: Node | null = null
		let offset = 0
		if (doc.caretRangeFromPoint) {
			const range = doc.caretRangeFromPoint(x, y)
			if (!range) return null
			node = range.startContainer
			offset = range.startOffset
		} else if (doc.caretPositionFromPoint) {
			const pos = doc.caretPositionFromPoint(x, y)
			if (!pos) return null
			node = pos.offsetNode
			offset = pos.offset
		} else {
			return null
		}

		const container =
			node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
		const lineEl = container?.closest('.code-line') as HTMLElement | null
		if (!lineEl) return null

		const lineNum = Number(lineEl.dataset.line)
		if (!Number.isFinite(lineNum)) return null
		const lineText = lines[lineNum - 1] ?? ''
		const inGutter = container?.closest('.code-line-number') != null

		let offsetInLine = 0
		const contentSpan = lineEl.querySelector(
			':scope > span:not(.code-line-number)',
		)
		if (!inGutter && contentSpan) {
			const measure = document.createRange()
			measure.selectNodeContents(contentSpan)
			measure.setEnd(node, offset)
			offsetInLine = measure.toString().length
		}
		offsetInLine = Math.max(0, Math.min(offsetInLine, lineText.length))

		let index = offsetInLine
		for (let i = 0; i < lineNum - 1; i++) {
			index += (lines[i]?.length ?? 0) + 1
		}
		return index
	}

	const handleRun = () => {
		if (!draft.trim()) {
			setError(
				'Nothing recognisable to trace — try console.log, setTimeout, or a promise.',
			)
			return
		}
		setCode(draft)
		setEditing(false)
		setError(null)
	}

	const handleCancel = () => {
		setDraft(code)
		setEditing(false)
		setError(null)
	}

	return (
		<div className="code-editor">
			<div className="code-editor-header">
				<h3>Source &middot; editable</h3>
				<span className="current-line-indicator">
					{editing
						? 'Click Trace this to run your edit'
						: currentLine
							? `Executing line ${currentLine}`
							: 'Click the code to edit it'}
				</span>
			</div>

			{editing ? (
				<div className="code-editor-edit">
					<textarea
						ref={textareaRef}
						className="code-editor-textarea"
						spellCheck={false}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
					/>
					<div className="code-editor-edit-actions">
						<button type="button" className="btn-trace" onClick={handleRun}>
							Trace this ▸
						</button>
						<button type="button" className="btn-cancel" onClick={handleCancel}>
							Cancel
						</button>
						<span className="code-editor-hint">
							Understands console.log, setTimeout, Promise.then, queueMicrotask,
							async/await, functions and simple variables.
						</span>
					</div>
				</div>
			) : (
				<pre
					className="code-editor-content"
					role="button"
					tabIndex={0}
					aria-label="Click to edit the source code"
					onClick={(e) => {
						enterEdit(caretIndexFromPoint(e.clientX, e.clientY))
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault()
							enterEdit()
						}
					}}
				>
					{lines.map((text, idx) => {
						const n = idx + 1
						const inBlock =
							currentLine != null &&
							blockEndLine != null &&
							n >= currentLine &&
							n <= blockEndLine
						const isCurrent = currentLine === n
						const segments = highlightedLines[idx] ?? []
						return (
							<div
								key={n}
								data-line={n}
								className={`code-line${inBlock ? ' active' : ''}${
									isCurrent ? ' current' : ''
								}`}
							>
								<span className="code-line-number">{n}</span>
								<span>
									{segments.length === 0
										? text || ' '
										: segments.map((seg, i) => (
												<span
													key={i}
													className={seg.kind ? `tok-${seg.kind}` : undefined}
												>
													{seg.text}
												</span>
											))}
								</span>
							</div>
						)
					})}
				</pre>
			)}

			{error && <div className="code-editor-error">{error}</div>}
		</div>
	)
}
