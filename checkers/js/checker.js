import solution from "./solution";

const readline = require("readline");
const chai = require("chai");

const assert = chai.assert;

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

var checks = [];

rl.on("line", function(line) {
  // console.log(line);
  checks.push(JSON.parse(line));
})

rl.on("close", function() {

  checks.forEach(function(check) {
    if (check["check"]) {
      process.stdout.write(check["check"]);
    } else {
      var result = solution.apply(null, check.arguments);
      const msg = check.arguments.map(function(arg) { return JSON.stringify(arg) }).join(", ");
      assert.deepEqual(result, check.expected, "Arguments was: (" + msg + ")");
    }
  });
});

