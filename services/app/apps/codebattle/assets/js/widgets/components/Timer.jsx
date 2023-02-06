import React, { useState, useEffect } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';

const Timer = ({ time }) => {
  const [duration, setDuration] = useState(moment().format('HH:mm:ss'));

  const updateTimer = () => {
    setDuration(moment.utc(moment().diff(moment.utc(time))).format('HH:mm:ss'));
  };

  useEffect(() => {
    const interval = setInterval(updateTimer, 77);
    return () => clearInterval(interval);
  });

  return <span className="text-monospace">{duration}</span>;
};

Timer.propTypes = {
  time: PropTypes.string.isRequired,
};

export default Timer;
