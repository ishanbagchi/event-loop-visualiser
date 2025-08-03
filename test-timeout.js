// Quick test to verify setTimeout step generation
// import { CodeExecutionSimulator } from './src/utils/codeSimulator.js';

const code = `console.log('Start');

setTimeout(() => {
  console.log('Timeout callback');
}, 1000);

console.log('End');`

console.log('Test code:')
console.log(code)

console.log('\nExpected execution order:')
console.log('1. console.log("Start") - synchronous')
console.log('2. setTimeout() called - registers timer, synchronous')
console.log('3. console.log("End") - synchronous')
console.log('4. (after delay) setTimeout callback executes - asynchronous')
console.log('5. console.log("Timeout callback") - inside callback')

console.log('\nExpected console output:')
console.log('Start')
console.log('End')
console.log('Timeout callback')
