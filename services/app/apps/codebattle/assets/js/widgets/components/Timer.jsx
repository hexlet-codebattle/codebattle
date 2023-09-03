import React from 'react';

import PropTypes from 'prop-types';

import useTimer from '../utils/useTimer';

function Timer({ time }) {
  const [duration] = useTimer(time);

  return <span className="text-monospace">{duration}</span>;
}

Timer.propTypes = {
  time: PropTypes.string.isRequired,
};

export default Timer;
