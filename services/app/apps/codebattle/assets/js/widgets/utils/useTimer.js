import { useState, useEffect } from 'react';

import moment from 'moment';

function useTimer(time) {
  const [duration, setDuration] = useState(moment().format('HH:mm:ss'));
  const [seconds, setSeconds] = useState(moment().seconds());

  const updateTimer = () => {
    if (seconds >= 0) {
      const diff = moment.utc(moment.utc(time).local().diff(moment()));

      setDuration(diff.format('HH:mm:ss'));
      setSeconds(moment.duration(diff).asSeconds());
    }
  };

  useEffect(() => {
    const interval = setInterval(updateTimer, 77);
    return () => clearInterval(interval);
  });

  return [duration, seconds];
}

export default useTimer;
