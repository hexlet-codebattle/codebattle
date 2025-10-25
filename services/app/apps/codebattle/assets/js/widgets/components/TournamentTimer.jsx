import React, { useState, useEffect } from 'react';

import dayjs from '../../i18n/dayjs';

const TournamentTimer = ({ date = new Date(), label, children }) => {
  const [duration, setDuration] = useState(0);
  const [stoped, setStoped] = useState(0);

  useEffect(() => {
    if (stoped) {
      return () => { };
    }

    const interval = setInterval(() => {
      setDuration(dayjs(date).diff(dayjs()));
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [date, stoped, setDuration]);

  if (stoped || duration > 1000 * 60 * 60 * 24) {
    return <>{children}</>;
  }

  if (duration < 0) {
    setStoped(true);
    return <>{children}</>;
  }

  return (
    <>
      {label}
      {' '}
      <span className="text-monospace">{dayjs.duration(duration).format('HH:mm:ss')}</span>
    </>
  );
};

export default TournamentTimer;
