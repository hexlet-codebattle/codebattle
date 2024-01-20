import React from 'react';

import cn from 'classnames';
import copy from 'copy-to-clipboard';
import Gon from 'gon';
import { PlayerIcon } from 'react-player-controls';
import { useDispatch } from 'react-redux';

import speedModes from '../../config/speedModes';
import { replayerMachineStates } from '../../machines/game';
import { actions } from '../../slices';

const gameId = Gon.getAsset('game_id');

function ControlPanel({
  roomMachineState,
  onPauseClick,
  onPlayClick,
  onChangeSpeed,
  children,
  nextRecordId,
}) {
  const dispatch = useDispatch();

  const { speedMode } = roomMachineState.context;
  const isPaused = !roomMachineState.matches({ replayer: replayerMachineStates.playing });

  const speedControlClassNames = cn('btn btn-sm rounded ml-2 border rounded-lg', {
    'btn-light': speedMode === speedModes.normal,
    'btn-secondary': speedMode === speedModes.fast,
  });

  const onControlButtonClick = () => {
    switch (true) {
      case roomMachineState.matches({ replayer: replayerMachineStates.ended }):
      case roomMachineState.matches({ replayer: replayerMachineStates.paused }):
        onPlayClick();
        break;
      case roomMachineState.matches({ replayer: replayerMachineStates.playing }):
        onPauseClick();
        break;
      default:
        dispatch(actions.setError(new Error('unexpected game state [players ControlPanel]')));
    }
  };

  return (
    <>
      <button
        type="button"
        className="mr-4 btn btn-light rounded-lg"
        onClick={onControlButtonClick}
      >
        {isPaused ? (
          <PlayerIcon.Play width={32} height={32} />
        ) : (
          <PlayerIcon.Pause width={32} height={32} />
        )}
      </button>
      {children}
      <div className="dropup ml-2">
        <button
          className="btn btn-light px-2 ml-1 shadow-none d-flex rounded-lg"
          type="button"
          id="dropdownMenuButton"
          data-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false"
        >
          <i className="fas fa-cog" />
        </button>
        <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
          <div className="d-flex">
            <button type="button" className={speedControlClassNames} onClick={onChangeSpeed}>x2</button>
            <button
              type="button"
              className="btn btn-sm rounded ml-2 border btn-light rounded-lg"
              title="Copy history game url at current record id"
              onClick={() => {
                const url = `https://codebattle.hexlet.io/games/${gameId}?t=${nextRecordId}`;
                copy(url);
              }}
            >
              <i className="fas fa-link" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ControlPanel;
