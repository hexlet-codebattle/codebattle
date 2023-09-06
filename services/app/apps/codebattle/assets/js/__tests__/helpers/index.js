import fs from 'fs';
import path from 'path';
import { URL } from 'url';

import moment from 'moment';

const getFixturePath = filename => path.join('..', '..', '__fixtures__', filename);
const readFixture = filename => fs.readFileSync(new URL(getFixturePath(filename), import.meta.url), 'utf-8').trim();
const getFixtureData = filename => JSON.parse(readFixture(filename));

export const getTestData = filename => getFixtureData(filename); // eslint-disable-line

export const toLocalTime = time => moment.utc(time).local().format('MM.DD HH:mm');
