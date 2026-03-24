import dayjs from "dayjs";
import "dayjs/locale/ru";
import duration from "dayjs/plugin/duration";
import timezone from "dayjs/plugin/timezone";
import updateLocale from "dayjs/plugin/updateLocale";
import utc from "dayjs/plugin/utc";

import { getLocale } from "./index";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(updateLocale);

const locale = getLocale();

dayjs.locale(locale);

dayjs.updateLocale(locale, {
  weekStart: 1,
});

export default dayjs;
