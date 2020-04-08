import React, { useState } from 'react';
import { PlayerIcon } from 'react-player-controls';
import DropDownItem from './DropDownItem';

const ControlPanel = ({
  onPlayClick, onPauseClick, defaultSpeed, setSpeed, hasStopped, children,
}) => {
  const [mode, setMode] = useState('pause');
  const [speedMode, setSpeedMode] = useState('normal');

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
        {hasStopped() ? (
          <PlayerIcon.Play width={32} height={32} />
        ) : (
          <PlayerIcon.Pause width={32} height={32} />
        )}
      </button>
      {children}
      <div className="dropdown ml-4 ">
        <button
          className="btn btn-secondary dropdown-toggle btn-sm"
          type="button"
          id="dropdownMenuButton"

          data-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false"
        >
          <i className="fa fa-cog" aria-hidden="true" />
        </button>

        <form
          className="dropdown-menu "
          aria-labelledby="dropdownMenuButton"
          style={{ maxWidth: '450px' }}
        >
          <DropDownItem
            icon="fa fa-forward"
            onClick={onChangeSpeed}
            speedMode={speedMode}
            text="change speed x2"
            id="1"
          />
        </form>
      </div>
    </>
  );
};

export default ControlPanel;
