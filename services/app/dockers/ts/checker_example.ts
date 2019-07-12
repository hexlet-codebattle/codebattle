import solution from './solution_example';
import { assert } from 'chai';

let success: boolean = true;

try {
  const assertEqual = function (result, expected, errorMessage) {
    try {
      assert.deepEqual(result, expected);

      process.stdout.write(`${JSON.stringify({
        status: 'success',
        result,
      })}\n`);
    } catch (err) {
      process.stdout.write(`${JSON.stringify({
        status: 'failure',
        result,
        arguments: errorMessage,
      })}\n`);
      success = false;
    }
  };

  const a1: number = 1;
  const b1: number = 2;
  const expected1: number = 3;

  assertEqual(solution(a1, b1), expected1, [1, 2]);

  const a2 = 5;
  const b2 = 3;
  const expected2: number = 8;

  assertEqual(solution(a2, b2), expected2, [5, 3]);

  if (success) {
    process.stdout.write(`${JSON.stringify({
      status: 'ok',
      result: '__code-0__',
    })}\n`);
  }
  process.exit(0);

} catch (err) {
  process.stdout.write(`${JSON.stringify({
    status: 'failure',
    result: err.message,
  })}\n`);
  process.exit(0);
}
