const reduce = fn => arr => arr.reduce(fn);

module.exports = (a, b) => (
  [a, b] |> reduce((acc, x) => acc + x)
);

