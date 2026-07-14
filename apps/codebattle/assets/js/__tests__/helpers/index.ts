import moment from 'moment';
import signUpData from '../../__fixtures__/signUpData.json';
import testData from '../../__fixtures__/testData.json';

const fixtures = {
  'signUpData.json': signUpData,
  'testData.json': testData,
};

export const getTestData = <Filename extends keyof typeof fixtures>(filename: Filename) =>
  fixtures[filename];

export const toLocalTime = (time: moment.MomentInput) =>
  moment.utc(time).local().format('MM.DD HH:mm');
