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

        assert.equal(result, check.expected, JSON.stringify(check.arguments));
      }
    });
  } catch (e) {
    process.stdout.write(JSON.stringify({
      status: "error",
      result: e.message
    }));
  }
});
