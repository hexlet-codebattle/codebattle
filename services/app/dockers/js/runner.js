import { readFileSync, readdirSync } from "fs";
import { createContext, runInContext } from "vm";
import { Writable } from "stream";
import { Console } from "console";
import { performance } from "perf_hooks";
import pkg from 'typescript';
import _ from "lodash";
import R from "rambda";

const { transpile } = pkg
const limitLength = 100
const limitCode = ' ...'

export function run(args = []) {
  let output = ''
  const fakeStream = new Writable()
  const myConsole = new Console(fakeStream)

  fakeStream.write = function (chank) {
    if (typeof chank == 'string')
      output += chank

    if(output.length > limitLength + limitCode.length)
      output = output.substr(0, limitLength) + limitCode
  }

  const toOut = ({ type = '', value = '', time = 0 }) => {
    console.log(
      JSON.stringify({
        type, time, value, output
      })
    )
    output = ''
  }

  const list = readdirSync('./', 'utf-8')

  list.sort((a, b) => a.length - b.length)

  const file = list
    .find(e => e.indexOf('solution') != -1)

  if (!file)
    throw new Error('No find solution file!')

  const scriptTest = readFileSync(file, 'utf-8')
  const context = createContext({
    require(name = '') {
      switch (name) {
        case 'lodash': return _
        case 'rambda': return R
      }
      throw new Error('No find module!')
    },
    console: myConsole,
    module: {
      exports: {}
    },
    get exports() {
      return this.module.exports
    }
  })

  try {
    let run = transpile(scriptTest)
    runInContext(run, context)

    if (output)
      toOut({ type: 'output', value: output })

    for (const a of args) {
      const now = performance.now()

      try {
        toOut({
          type: 'result',
          value: context.module.exports(...a),
          time: performance.now() - now
        })
      } catch (e) {
        toOut({
          type: 'error',
          value: e.toString(),
          time: performance.now() - now,
        })
      }
    }

  } catch (e) {
    throw e
  }
}

