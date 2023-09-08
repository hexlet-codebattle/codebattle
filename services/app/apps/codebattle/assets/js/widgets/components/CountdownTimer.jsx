import React, { useState, useEffect } from 'react';

import cn from 'classnames';
import moment from 'moment';
import PropTypes from 'prop-types';

const getProgress = (a, b) => 100 - Math.ceil((a / b) * 100);

const getDuration = (time, timeoutSeconds) => {
  const diff = moment().diff(moment.utc(time));
  const timeoutMiliseconds = timeoutSeconds * 1000;
  const timeLeft = Math.max(timeoutMiliseconds - diff, 0);

  return timeLeft;
};

function CountdownTimer({ time, timeoutSeconds }) {
  const [duration, setDuration] = useState(() => getDuration(time, timeoutSeconds));
  const seconds = duration / 1000;
  const progress = getProgress(seconds, timeoutSeconds);

  const progressBgColor = cn('cb-timer-progress', {
    'bg-secondary': seconds > 45,
    'bg-warning': seconds <= 45 && seconds >= 15,
    'bg-danger': seconds < 15,
  });

  const updateTimer = () => {
    const timeLeft = getDuration(time, timeoutSeconds);

    setDuration(timeLeft);
  };

  useEffect(() => {
    const interval = setInterval(updateTimer, 999);
    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <span className="text-monospace">
        {timeoutSeconds && 'Timeout in: '}
        <span>{moment.utc(duration).format('HH:mm:ss')}</span>
      </span>
      <div className={progressBgColor} style={{ width: `${progress}%` }} />
    </>
  );
}

CountdownTimer.propTypes = {
  time: PropTypes.string.isRequired,
};

export default CountdownTimer;
