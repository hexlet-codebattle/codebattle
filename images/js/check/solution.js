const _ = require('lodash')
const R = require('rambda')

module.exports = (a, b) => {
  const res = a / b
  console.log('Аля-улю')

  if (res == Infinity) {
    console.log('Патаму, что', res)
    throw new Error('Брысь от сюда!')
  }

  return res
}
