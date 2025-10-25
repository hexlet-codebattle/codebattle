import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import timezone from 'dayjs/plugin/timezone';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(updateLocale);

const locale = dayjs.locale();

// const locale = dayjs.locale('es');
// dayjs.tz.setDefault('Europe/Madrid');
console.log(`Local: ${dayjs.tz.guess()}`);
/* eslint-disable-next-line */

dayjs.updateLocale(locale, {
  weekStart: 1,
});

export default dayjs;
