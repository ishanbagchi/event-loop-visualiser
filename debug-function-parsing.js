const testCode = `function tenth() {
  console.log("10")
 }

function ninth() { 
  console.log("9")
  tenth() }

function first() { 
  console.log("1")
  ninth() }

first();`

const lines = testCode.split('\n')

console.log('All lines:')
lines.forEach((line, index) => {
	console.log(`Line ${index + 1}: "${line}"`)
})

// Manual brace counting for first function (starting at line 8)
console.log('\nManual brace counting for first() function starting at line 9:')
let braceCount = 0
for (let i = 8; i < lines.length; i++) {
	// line 9 = index 8
	const line = lines[i]
	const openBraces = (line.match(/\{/g) || []).length
	const closeBraces = (line.match(/\}/g) || []).length
	braceCount += openBraces
	braceCount -= closeBraces
	console.log(
		`Line ${
			i + 1
		}: "${line}" | open: ${openBraces}, close: ${closeBraces}, count: ${braceCount}`,
	)

	if (braceCount === 0 && i > 8) {
		console.log(`Function should end at line ${i + 1}`)
		break
	}
}
