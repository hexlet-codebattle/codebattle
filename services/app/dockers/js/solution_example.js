const reduce = fn => arr => arr.reduce(fn);

module.exports = (a, b) => (
  console.log(a),
  console.log(b),
  [a, b] |> reduce((acc, x) => acc + x)
);
