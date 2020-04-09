import React, { useState } from 'react';
import { PlayerIcon } from 'react-player-controls';
import Dropdown, { MenuItem } from './ControlPanel/DropDown/index';

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

  const onChangeSpeed = speedMode2 => {
    switch (speedMode2) {
      case 'fast':
        setSpeed(defaultSpeed / 2);
        setSpeedMode(speedMode2);
        break;
      case 'normal':
        setSpeed(defaultSpeed);
        setSpeedMode(speedMode2);
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

      <Dropdown dropup className="ml-3">
        <Dropdown.Toggle btnSize="lg"><i className="fa fa-cog" /></Dropdown.Toggle>
        <Dropdown.Menu>
          <MenuItem>
            { `Speed: ${speedMode}` }
            <MenuItem
              active={speedMode === 'normal'}
              onSelect={() => onChangeSpeed('normal')}
            >
              <i className="fa fa-play mr-2" />
              normal
            </MenuItem>
            <MenuItem
              active={speedMode === 'fast'}
              onSelect={() => onChangeSpeed('fast')}
            >
              <i className="fa fa-forward mr-2" />
              fast
            </MenuItem>
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>

    </>
  );
};

export default ControlPanel;
