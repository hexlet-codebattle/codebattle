const readline = require("readline");
const chai = require("chai");

const assert = chai.assert;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const checks = [];

rl.on("line", function(line) {
  // console.log(line);
  checks.push(JSON.parse(line));
});

rl.on("close", function() {
  try {
    const solution = require("./check/solution");

    checks.forEach(function(check) {
      if (check.check) {
        process.stdout.write(JSON.stringify({
          status: "ok",
          result: check.check
        }));
      } else {
        const result = solution.apply(null, check.arguments);

        try {
          assert.deepEqual(result, check.expected);
        } catch (e) {
          process.stdout.write(JSON.stringify({
            status: "failure",
            result: check.arguments
          }));
          process.exit(1);
        }
      }
    });
  } catch (e) {
    process.stdout.write(JSON.stringify({
      status: "error",
      result: e.message
    }));
    process.exit(1);
  }
});
