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
  children,
  nextRecordId,
  onChangeSpeed,
  onPauseClick,
  onPlayClick,
  roomCurrent,
}) {
  const dispatch = useDispatch();

  const { speedMode } = roomCurrent.context;
  const isPaused = !roomCurrent.matches({ replayer: replayerMachineStates.playing });

  const speedControlClassNames = cn('btn btn-sm rounded ml-2 border rounded-lg', {
    'btn-light': speedMode === speedModes.normal,
    'btn-secondary': speedMode === speedModes.fast,
  });

  const onControlButtonClick = () => {
    switch (true) {
      case roomCurrent.matches({ replayer: replayerMachineStates.ended }):
      case roomCurrent.matches({ replayer: replayerMachineStates.paused }):
        onPlayClick();
        break;
      case roomCurrent.matches({ replayer: replayerMachineStates.playing }):
        onPauseClick();
        break;
      default:
        dispatch(actions.setError(new Error('unexpected game state [players ControlPanel]')));
    }
  };

  return (
    <>
      <button
        className="mr-4 btn btn-light rounded-lg"
        type="button"
        onClick={onControlButtonClick}
      >
        {isPaused ? (
          <PlayerIcon.Play height={32} width={32} />
        ) : (
          <PlayerIcon.Pause height={32} width={32} />
        )}
      </button>
      {children}
      <div className="dropup ml-2">
        <button
          aria-expanded="false"
          aria-haspopup="true"
          className="btn btn-light px-2 ml-1 shadow-none d-flex rounded-lg"
          data-toggle="dropdown"
          id="dropdownMenuButton"
          type="button"
        >
          <i className="fas fa-cog" />
        </button>
        <div aria-labelledby="dropdownMenuButton" className="dropdown-menu">
          <div className="d-flex">
            <button className={speedControlClassNames} type="button" onClick={onChangeSpeed}>
              x2
            </button>
            <button
              className="btn btn-sm rounded ml-2 border btn-light rounded-lg"
              title="Copy history game url at current record id"
              type="button"
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
