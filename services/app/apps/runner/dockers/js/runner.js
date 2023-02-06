const { readFileSync, readdirSync } = require('fs');
const { createContext, runInContext } = require('vm');
const { Writable } = require('stream');
const { Console } = require('console');
const { performance } = require('perf_hooks');
const pkg = require('typescript');
const _ = require('lodash');
const R = require('rambda');

const { transpile } = pkg;
const limitLength = 100;
const limitCode = ' ...';

exports.run = function run(args = []) {
  let output = '';
  const fakeStream = new Writable();
  const myConsole = new Console(fakeStream);

  fakeStream.write = function (chank) {
    if (typeof chank == 'string') output += chank;

    if (output.length > limitLength + limitCode.length)
      output = output.slice(0, limitLength - 1) + limitCode;
  };

  const toOut = ({ type = '', value = '', time = 0 }) => {
    console.log(
      JSON.stringify({
        type,
        time,
        value,
        output,
      })
    );
    output = '';
  };

  process.chdir('./check');
  const list = readdirSync('./', 'utf-8');

  list.sort((a, b) => a.length - b.length);

  const file = list.find((e) => e.indexOf('solution') != -1);

  if (!file) throw new Error('No find solution file!');

  const scriptTest = readFileSync(file, 'utf-8');
  process.chdir('../');
  const context = createContext({
    require(name = '') {
      switch (name) {
        case 'lodash':
          return _;
        case 'rambda':
          return R;
      }
      throw new Error('No find module!');
    },
    console: myConsole,
    module: {
      exports: {},
    },
    get exports() {
      return this.module.exports;
    },
  });

  try {
    const run = transpile(scriptTest, { target: 'ESNext', module: 'CommonJs' });
    runInContext(run, context);

    if (output) toOut({ type: 'output', value: output });

    for (const a of args) {
      const now = performance.now();
      let runner = context.exports;

      if (typeof runner != 'function') runner = runner.default;
      try {
        toOut({
          type: 'result',
          value: runner(...a),
          time: (performance.now() - now).toFixed(5),
        });
      } catch (e) {
        toOut({
          type: 'error',
          value: e.toString(),
          time: (performance.now() - now).toFixed(5),
        });
      }
    }
  } catch (e) {
    throw e;
  }
};
