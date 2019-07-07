import solution from './solution_example';
import { assert } from 'chai';

try {
  const assertEqual = function (result, expected, errorMessage) {
    try {
      assert.deepEqual(result, expected);
    } catch (err) {
      process.stdout.write(JSON.stringify({
        status: 'failure',
        result: errorMessage,
      }));
      process.exit(0);
    }
  };

  const a1: number = 1;
  const b1: number = 2;
  const expected1: number = 3;

  assertEqual(solution(a1, b1), expected1, '[1, 2]');

  const a2 = 5;
  const b2 = 3;
  const expected2: number = 8;

  assertEqual(solution(a2, b2), expected2, '[5, 3]');

  process.stdout.write(JSON.stringify({
    status: 'ok',
    result: '__code0.0__',
  }));
  process.exit(0);

} catch (err) {
  process.stdout.write(JSON.stringify({
    status: 'failure',
    result: err.message,
  }));
  process.exit(0);
}
