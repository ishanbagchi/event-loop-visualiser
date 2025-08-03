// Test to verify the actual JavaScript execution order
console.log('=== ACTUAL JavaScript execution ===')

console.log('Start')

setTimeout(() => {
	console.log('Timeout callback')
}, 1000)

console.log('End')

console.log('=== End of test ===')
