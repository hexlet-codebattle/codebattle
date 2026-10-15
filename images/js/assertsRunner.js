const solution = require("./asserts/solution");
const generate = require("./asserts/arguments");
const { Writable } = require('stream');
const { Console } = require('console');
const { performance } = require('perf_hooks');

const limitCode = ' ...';
const limitLength = 100;

exports.run = function run(args = [], count) {
  let output = '';
  let oldConsole = console;

  const fakeStream = new Writable();
  const myConsole = new Console(fakeStream);

  fakeStream.write = function(chank) {
    if (typeof chank == 'string') output += chank;

    if (output.length > limitLength + limitCode.length)
      output = output.slice(0, limitLength - 1) + limitCode;
  };

  console = myConsole;

  const toOut = ({
    type,
    time = 0,
    arguments = [],
    expected = '<This may be your\'s addvertising>',
    actual = '<This may be your\'s addvertising>',
    message = '',
  }) => {
    oldConsole.log(
      JSON.stringify({
        type,
        time,
        arguments,
        expected,
        actual,
        output,
        message,
      })
    );
    output = '';
  };

  for (const item of args) {
    const now = performance.now();

    try {
      const actual = solution(...JSON.parse(item.arguments));

      toOut({
        type: 'result',
        arguments: JSON.parse(item.arguments),
        actual,
        expected: JSON.parse(item.expected),
        time: (performance.now() - now).toFixed(5),
      });
    } catch (e) {
      toOut({
        type: 'error',
        message: e.toString(),
        time: (performance.now() - now).toFixed(5),
      });
    }
  }

  for (let i = 0; i < count; i++) {
    const now = performance.now();

    try {
      const arguments = generate();
      const expected = solution(...arguments);

      toOut({
        type: 'success',
        arguments: arguments,
        expected: expected,
        time: (performance.now() - now).toFixed(5),
      });
    } catch (e) {
      toOut({
        type: 'error',
        message: e.toString(),
        time: (performance.now() - now).toFixed(5),
      });
    }
  }
}
