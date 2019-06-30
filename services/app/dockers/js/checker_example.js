const chai = require('chai');

const { assert } = chai;

try {
  // We can change solution to check different behaviors
  const solution = require('./solution_example');
  // const solution = require('./solution');

  const result1 = solution.apply(null, [1, 2]); // arguments1

  try {
    assert.deepEqual(result1, 3); // expected1
  } catch (e) {
    process.stdout.write(JSON.stringify({
      status: 'failure',
      result: [1, 2], // arguments1
    }));
    process.exit(0);
  }

  const result2 = solution.apply(null, [5, 6]); // arguments2

  try {
    assert.deepEqual(result2, 11); // expected2
  } catch (e) {
    process.stdout.write(JSON.stringify({
      status: 'failure',
      result: [5, 6], // arguments2
    }));
    process.exit(0);
  }

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
