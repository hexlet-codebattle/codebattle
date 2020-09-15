import React, { useState, useEffect } from 'react';
import moment from 'moment';
import cn from 'classnames';
import PropTypes from 'prop-types';

const CountdownTimer = ({ time, timeoutSeconds }) => {
  const [duration, setDuration] = useState(60 * 3 * 1000);

  const getBgColor = () => {
    const seconds = duration / 1000;
    if (seconds > 45) {
      return '';
    }
    if (seconds > 15) {
      return 'bg-warning';
    }
    return 'bg-danger';
  };
  const updateTimer = () => {
    const diff = moment().diff(moment.utc(time));
    const timeoutMiliseconds = timeoutSeconds * 1000;
    const timeLeft = Math.max(timeoutMiliseconds - diff, 0);

    setDuration(timeLeft);
  };

  useEffect(() => {
    const interval = setInterval(updateTimer, 999);
    return () => {
      clearInterval(interval);
    };
  });

  return (
    <span className={cn('text-monospace', getBgColor())}>
      {timeoutSeconds && 'Timeout in: '}
      <span>{moment.utc(duration).format('HH:mm:ss')}</span>
    </span>
  );
};

CountdownTimer.propTypes = {
  time: PropTypes.string.isRequired,
};

export default CountdownTimer;
