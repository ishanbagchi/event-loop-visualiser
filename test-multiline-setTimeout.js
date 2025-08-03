// Quick test to verify multiline setTimeout delay extraction
import { CodeExecutionSimulator } from './src/utils/codeSimulator.ts'

const testCode = `console.log('Start');

setTimeout(() => {
    console.log('Timeout callback');
}, 1000);

setTimeout(() => {
    console.log('Timeout callback');
}, 2000);

console.log('End');`

console.log('Testing multiline setTimeout delay extraction:')
console.log('==============================================')

const simulator = new CodeExecutionSimulator()
const steps = simulator.simulateCode(testCode)

// Find all setTimeout-related steps
const setTimeoutSteps = steps.filter(
	(step) =>
		step.type === 'web-api' &&
		step.description.includes('timer registered'),
)

console.log(`Found ${setTimeoutSteps.length} setTimeout registrations:`)

setTimeoutSteps.forEach((step, index) => {
	console.log(`${index + 1}. Line ${step.lineNumber}: ${step.description}`)

	// Check the webAPIs in the step state
	const webAPIs = step.state?.webAPIs || []
	const timeoutAPI = webAPIs.find((api) => api.type === 'setTimeout')
	if (timeoutAPI) {
		console.log(
			`   → WebAPI: ${timeoutAPI.name}, Time: ${timeoutAPI.timeRemaining}ms`,
		)
	}
})

console.log('\nExpected result:')
console.log('1. First setTimeout should show 1000ms')
console.log('2. Second setTimeout should show 2000ms')
