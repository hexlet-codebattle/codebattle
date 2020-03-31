import React, { useState, useEffect } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';

const CountdownTimer = ({ time, timeoutSeconds }) => {
  const [duration, setDuration] = useState(moment().format('HH:mm:ss'));

  const updateTimer = () => {
    const diff = moment().diff(moment.utc(time));
    const timeoutMiliseconds = timeoutSeconds * 1000;
    const timeLeft = Math.max(timeoutMiliseconds - diff, 0);

    setDuration(moment.utc(timeLeft).format('HH:mm:ss'));
  };

  useEffect(() => {
    const interval = setInterval(updateTimer, 77);
    return () => {
      clearInterval(interval);
    };
  });

  return <span className="text-monospace">{duration}</span>;
};

CountdownTimer.propTypes = {
  time: PropTypes.string.isRequired,
};

export default CountdownTimer;
