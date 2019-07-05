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

  interface Arguments {
    a: number;
    b: number;
  };

  interface Expected {
    result: number;
  };

  const arguments1: Arguments = {
    a: 1,
    b: 2,
  };

  const expected1: Expected = {
    result: 3,
  };

  assertEqual(solution(arguments1.a, arguments1.b), expected1.result, '[1, 2]');

  const arguments2: Arguments = {
    a: 5,
    b: 3,
  };

  const expected2: Expected = {
    result: 8,
  };

  assertEqual(solution(arguments2.a, arguments2.b), expected2.result, '[5, 3]');

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
