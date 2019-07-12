const chai = require('chai');

const { assert } = chai;

let success = true;

try {
  // We can change solution to check different behaviors
  const solution = require('./solution_example');
  // const solution = require('./solution');

  const assertSolution = (result, expected, errorMessage) => {
    try {
      assert.deepEqual(result, expected);

      process.stdout.write(`${JSON.stringify({
        status: 'success',
        result,
      })}\n`);
    } catch (e) {
      process.stdout.write(`${JSON.stringify({
        status: 'failure',
        result,
        arguments: errorMessage,
      })}\n`);
      success = false;
    }
  };

  assertSolution(solution(1, 2), 3, [1, 2]); // arguments1, expected1
  assertSolution(solution(5, 6), 11, [5, 6]); // arguments2, expected2

  if (success) {
    process.stdout.write(`${JSON.stringify({
      status: 'ok',
      result: '__code0.0__',
    })}\n`);
  }
  process.exit(0);
} catch (e) {
  process.stdout.write(`${JSON.stringify({
    status: 'error',
    result: e.message,
  })}\n`);
  process.exit(0);
}
