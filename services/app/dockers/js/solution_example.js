const _ = require('lodash')
const R = require('rambda')

console.log(_)

module.exports = (a, b) => {
  const res = a / b

  if(res == Infinity) {
    console.log('Патаму, что', res)
    throw new Error('Брысь от сюда!')
  }

  return res
}
