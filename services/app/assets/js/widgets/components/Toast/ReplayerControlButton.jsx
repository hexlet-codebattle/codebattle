import React, { useContext } from 'react';
import { useDispatch } from 'react-redux';
import GameContext from '../../containers/GameContext';
import i18n from '../../../i18n';
import { actions } from '../../slices';
import { downloadPlaybook } from '../../middlewares/Game';
import { replayerMachineStates, gameMachineStates } from '../../machines/game';

const ReplayerControlButton = () => {
  const dispatch = useDispatch();
  const { current, send, service } = useContext(GameContext);

  switch (true) {
    case current.matches({ game: gameMachineStates.stored }): {
      return null;
    }
    case current.matches({ replayer: replayerMachineStates.empty }): {
      return (
        <button
          type="button"
          onClick={() => dispatch(downloadPlaybook(service))}
          className="btn btn-secondary btn-block mb-3"
          aria-label="Open Record Player"
        >
          {i18n.t('Open History')}
        </button>
      );
    }
    case current.matches({ replayer: replayerMachineStates.off }): {
      return (
        <button
          type="button"
          onClick={() => send('OPEN_REPLAYER')}
          className="btn btn-secondary btn-block mb-3"
          aria-label="Open Record Player"
        >
          {i18n.t('Open History')}
        </button>
      );
    }
    case current.matches({ replayer: replayerMachineStates.on }): {
      return (
        <button
          type="button"
          onClick={() => send('CLOSE_REPLAYER')}
          className="btn btn-secondary btn-block mb-3"
          aria-label="Close Record Player"
        >
          {i18n.t('Return to game')}
        </button>
      );
    }
    default: {
      dispatch(actions.setError(new Error('unnexpected game machine state [ReplayerButton]')));
      return null;
    }
  }
};

export default ReplayerControlButton;
