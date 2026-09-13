import React from 'react';

import useTimer from '../utils/useTimer';

interface TimerProps {
  time: string;
}

function Timer({ time }: TimerProps) {
  const [duration] = useTimer(time);

  return <span style={{ fontFamily: 'monospace' }}>{duration}</span>;
}

export default Timer;
