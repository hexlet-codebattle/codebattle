const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const chai = require('chai');

const { assert } = chai;
const buildRespose = data => `${JSON.stringify(data)}\n`;

const NS_PER_SEC = 1e9;

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

  const assertSolution = (solutionLambda, expected, args) => {
    const start = process.hrtime()
    const result = solutionLambda(args)
    const diff = process.hrtime(start) // returns [seconds, nanoseconds]
    const executionTime = diff[0] + diff[1] / NS_PER_SEC;
    try {
      assert.deepEqual(result, expected);
      finalResult.push(buildRespose({
        status: 'success',
        result,
        output,
        expected,
        arguments: args,
        execution_time: executionTime,
      }));
    } catch (e) {
      finalResult.push(
        buildRespose({
          status: 'failure',
          result,
          output,
          expected,
          arguments: args,
          executionTime,
        }),
      );
      success = false;
    }
    output = '';
  };

  const solutionLambda = args => { return solution(...args); };
  assertSolution(solutionLambda, 3, [1, 2]);
  assertSolution(solutionLambda, 11, [5, 6]);

  if (success) {
    finalResult.push(buildRespose({ status: 'ok', result: '__code0.0__' }));
  }
} catch (e) {
  finalResult.push(buildRespose({ status: 'error', output: e.message }));
}

process.stdout.write = originalStdoutWrite;
process.stdout.write(finalResult.join());
