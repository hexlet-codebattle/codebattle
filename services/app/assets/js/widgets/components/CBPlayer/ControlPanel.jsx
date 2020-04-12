import React, { useState, useEffect } from 'react';
import { PlayerIcon } from 'react-player-controls';
import cn from 'classnames';

const ControlPanel = ({
  onPlayClick, onPauseClick, defaultSpeed, setSpeed, isStop, children,
}) => {
  const [mode, setMode] = useState('pause');
  const [speedMode, setSpeedMode] = useState('normal');

  const speedControlClassNames = cn('btn btn-sm border rounded ml-4', {
    'btn-light': speedMode === 'normal',
    'btn-secondary': speedMode === 'fast',
  });

  useEffect(() => {
    if(isStop) {
      setMode("pause");
    }
  }, [isStop]);

  const onControlButtonClick = () => {
    switch (mode) {
      case 'pause':
        onPlayClick();
        setMode('playing');
        break;
      case 'playing':
        onPauseClick();
        setMode('pause');
        break;
      default:
        break;
    }
  };

  const onChangeSpeed = () => {
    switch (speedMode) {
      case 'normal':
        setSpeed(defaultSpeed / 2);
        setSpeedMode('fast');
        break;
      case 'fast':
        setSpeed(defaultSpeed);
        setSpeedMode('normal');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <button
        type="button"
        className="mr-4 btn btn-light"
        onClick={onControlButtonClick}
      >
        {isStop ? (
          <PlayerIcon.Play width={32} height={32} />
        ) : (
          <PlayerIcon.Pause width={32} height={32} />
        )}
      </button>
      {children}
      <button type="button" className={speedControlClassNames} onClick={onChangeSpeed}>x2</button>
    </>
  );
};

export default ControlPanel;
