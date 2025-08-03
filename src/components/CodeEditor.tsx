import { Editor } from '@monaco-editor/react'
import { useAppStore } from '../store'
import { useEffect, useRef } from 'react'
import type * as Monaco from 'monaco-editor'

export const CodeEditor = () => {
	const { code, setCode, currentLine } = useAppStore()
	const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
	const monacoRef = useRef<typeof Monaco | null>(null)
	const decorationsRef =
		useRef<Monaco.editor.IEditorDecorationsCollection | null>(null)

	const handleEditorChange = (value: string | undefined) => {
		if (value !== undefined) {
			setCode(value)
		}
	}

	const handleEditorMount = (
		editor: Monaco.editor.IStandaloneCodeEditor,
		monaco: typeof Monaco,
	) => {
		editorRef.current = editor
		monacoRef.current = monaco
	}

	// Helper function to find the end line of a function block
	const findFunctionEndLine = (
		model: Monaco.editor.ITextModel,
		startLine: number,
	): number => {
		const startLineContent = model.getLineContent(startLine).trim()

		// Check if this line starts a function block (setTimeout, setInterval, Promise, etc.)
		const functionPatterns = [
			/setTimeout\s*\(/,
			/setInterval\s*\(/,
			/Promise\s*\./,
			/\.then\s*\(/,
			/\.catch\s*\(/,
			/function\s*\(/,
			/=>\s*{/,
		]

		const isFunctionStart = functionPatterns.some((pattern) =>
			pattern.test(startLineContent),
		)

		if (!isFunctionStart) {
			return startLine // Not a function, highlight just this line
		}

		// Find the matching closing brace/parenthesis
		let braceCount = 0
		let parenCount = 0
		let inString = false
		let stringChar = ''

		for (
			let lineNum = startLine;
			lineNum <= model.getLineCount();
			lineNum++
		) {
			const lineContent = model.getLineContent(lineNum)

			for (let i = 0; i < lineContent.length; i++) {
				const char = lineContent[i]
				const prevChar = i > 0 ? lineContent[i - 1] : ''

				// Handle string literals
				if (
					(char === '"' || char === "'" || char === '`') &&
					prevChar !== '\\'
				) {
					if (!inString) {
						inString = true
						stringChar = char
					} else if (char === stringChar) {
						inString = false
						stringChar = ''
					}
					continue
				}

				if (inString) continue

				// Count braces and parentheses
				if (char === '{') braceCount++
				else if (char === '}') braceCount--
				else if (char === '(') parenCount++
				else if (char === ')') parenCount--

				// If we've closed all braces and parentheses, we found the end
				if (
					braceCount === 0 &&
					parenCount === 0 &&
					lineNum > startLine
				) {
					// Check if this line ends with ); which indicates end of function call
					if (
						lineContent.trim().endsWith(');') ||
						lineContent.trim().endsWith('}')
					) {
						return lineNum
					}
				}
			}
		}

		return startLine // Fallback to single line if we can't find the end
	}

	// Update line highlighting when currentLine changes
	useEffect(() => {
		if (
			editorRef.current &&
			monacoRef.current &&
			currentLine &&
			currentLine > 0
		) {
			// Get the total line count to ensure we don't highlight invalid lines
			const model = editorRef.current.getModel()
			if (model && currentLine <= model.getLineCount()) {
				// Get the line content to check if it's not empty
				const lineContent = model.getLineContent(currentLine).trim()

				if (lineContent) {
					// Find the end line of the function block
					const endLine = findFunctionEndLine(model, currentLine)

					// Clear previous decorations and add new highlight
					if (decorationsRef.current) {
						decorationsRef.current.clear()
					}

					const newDecorations = [
						{
							range: new monacoRef.current.Range(
								currentLine,
								1,
								endLine,
								model.getLineContent(endLine).length + 1,
							),
							options: {
								className: 'current-function-highlight',
								glyphMarginClassName: 'current-line-glyph',
							},
						},
					]
					decorationsRef.current =
						editorRef.current.createDecorationsCollection(
							newDecorations,
						)
					return
				}
			}
		}

		// Clear decorations if no valid current line
		if (editorRef.current && decorationsRef.current) {
			decorationsRef.current.clear()
		}
	}, [currentLine])

	return (
		<div className="code-editor">
			<div className="code-editor-header">
				<h3>Code Editor</h3>
				{currentLine && (
					<div className="current-line-indicator">
						Executing line {currentLine}
					</div>
				)}
			</div>
			<div className="code-editor-content">
				<Editor
					height="100%"
					defaultLanguage="javascript"
					value={code}
					onChange={handleEditorChange}
					onMount={handleEditorMount}
					options={{
						minimap: { enabled: false },
						fontSize: 14,
						lineNumbers: 'on',
						roundedSelection: false,
						scrollBeyondLastLine: false,
						automaticLayout: true,
						wordWrap: 'on',
						tabSize: 2,
						matchBrackets: 'always',
						theme: 'vs-light',
						// Autocomplete and suggestions - DISABLED
						quickSuggestions: false,
						suggestOnTriggerCharacters: false,
						acceptSuggestionOnCommitCharacter: false,
						acceptSuggestionOnEnter: 'off',
						wordBasedSuggestions: 'off',
						parameterHints: {
							enabled: false,
							cycle: false,
						},
						suggest: {
							showKeywords: false,
							showSnippets: false,
							showFunctions: false,
							showConstructors: false,
							showDeprecated: false,
							showFields: false,
							showVariables: false,
							showClasses: false,
							showStructs: false,
							showInterfaces: false,
							showModules: false,
							showProperties: false,
							showEvents: false,
							showOperators: false,
							showUnits: false,
							showValues: false,
							showConstants: false,
							showEnums: false,
							showEnumMembers: false,
							showColors: false,
							showFiles: false,
							showReferences: false,
							showFolders: false,
							showTypeParameters: false,
							showUsers: false,
							showIssues: false,
						},
					}}
				/>
			</div>
		</div>
	)
}
