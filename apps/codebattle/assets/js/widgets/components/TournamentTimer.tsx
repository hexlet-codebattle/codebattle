import React, { useState, useEffect, type ReactNode } from 'react';

import { Text } from '@mantine/core';

import dayjs from '../../i18n/dayjs';

interface TournamentTimerProps {
  date?: string | number | Date;
  label?: ReactNode;
  children?: ReactNode;
}

function TournamentTimer({ date = new Date(), label, children }: TournamentTimerProps) {
  const [duration, setDuration] = useState(0);
  const [stoped, setStoped] = useState<number | boolean>(0);

  useEffect(() => {
    if (stoped) {
      return () => {};
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
    <Text component="span" display="inline-flex">
      {label}{' '}
      <Text component="span" ff="monospace" c="yellow" ml="sm">
        {dayjs.duration(duration).format('HH:mm:ss')}
      </Text>
    </Text>
  );
}

export default TournamentTimer;
