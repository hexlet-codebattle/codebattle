const chai = require('chai');

const { assert } = chai;

try {
  // We can change solution to check different behaviors
  const solution = require('./solution_example');
  // const solution = require('./solution');

  const assertSolution = (result, expected, errorMessage) => {
    try {
      assert.deepEqual(result, expected);
    } catch (e) {
      process.stdout.write(JSON.stringify({
        status: 'failure',
        result: errorMessage,
      }));
      process.exit(0);
    }
  };

  assertSolution(solution(1, 2), 3, '[1, 2]'); // arguments1, expected1
  assertSolution(solution(5, 6), 11, '[5, 6]'); // arguments2, expected2

  process.stdout.write(JSON.stringify({
    status: 'ok',
    result: '__code0.0__',
  }));
} catch (e) {
  process.stdout.write(JSON.stringify({
    status: 'error',
    result: e.message,
  }));
  process.exit(0);
}
