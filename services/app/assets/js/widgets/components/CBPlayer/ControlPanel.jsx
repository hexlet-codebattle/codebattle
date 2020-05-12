import React, { useState, useEffect } from 'react';
import { PlayerIcon } from 'react-player-controls';
import cn from 'classnames';

const modes = {
  pause: 'pause',
  playing: 'playing',
};

const speedModes = {
  normal: 'normal',
  fast: 'fast',
};

const ControlPanel = ({
  onPlayClick, onPauseClick, defaultSpeed, setSpeed, isStop, children,
}) => {
  const [mode, setMode] = useState(modes.pause);
  const [speedMode, setSpeedMode] = useState(speedModes.normal);

  const speedControlClassNames = cn('btn btn-sm border rounded ml-4', {
    'btn-light': speedMode === speedModes.normal,
    'btn-secondary': speedMode === speedModes.fast,
  });

  useEffect(() => {
    setMode(isStop ? modes.pause : modes.playing);
  }, [isStop]);

  const onControlButtonClick = () => {
    switch (mode) {
      case modes.pause:
        onPlayClick();
        setMode(modes.playing);
        break;
      case modes.playing:
        onPauseClick();
        setMode(modes.pause);
        break;
      default:
        break;
    }
  };

  const onChangeSpeed = () => {
    switch (speedMode) {
      case speedModes.normal:
        setSpeed(defaultSpeed / 2);
        setSpeedMode(speedModes.fast);
        break;
      case speedModes.fast:
        setSpeed(defaultSpeed);
        setSpeedMode(speedModes.normal);
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
        {mode === modes.pause ? (
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
