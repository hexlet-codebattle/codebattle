const { faker } = require('@faker-js/faker');

const generate = () => {
  return [
    faker.number.int(50),
    faker.number.int(50),
  ];
}

module.exports = generate;
