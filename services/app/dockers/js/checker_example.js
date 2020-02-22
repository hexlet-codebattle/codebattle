const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const chai = require('chai');

const { assert } = chai;
const buildRespose = data => `${JSON.stringify(data)}\n`;

let success = true;
let output = '';
const finalResult = [];

process.stdout.write = (chunk, encoding, callback) => {
  if (typeof chunk === 'string') {
    output += chunk;
  }
};

try {
  // We can change solution to check different behaviors
  const solution = require('./solution_example');
  // const solution = require('./solution');

  output = '';

  const assertSolution = (result, expected, arguments) => {
    try {
      assert.deepEqual(result, expected);
      finalResult.push(buildRespose({ status: 'success', result, output, expected, arguments }));
    } catch (e) {
      finalResult.push(
        buildRespose({
          status: 'failure',
          result,
          output,
          expected,
          arguments,
        }),
      );
      success = false;
    }
    output = '';
  };

  assertSolution(solution(1, 2), 3, [1, 2]); // arguments1, expected1
  assertSolution(solution(5, 6), 11, [5, 6]); // arguments2, expected2

  if (success) {
    finalResult.push(buildRespose({ status: 'ok', result: '__code0.0__' }));
  }
} catch (e) {
  finalResult.push(buildRespose({ status: 'error', output: e.message }));
}

process.stdout.write = originalStdoutWrite;
process.stdout.write(finalResult.join());
