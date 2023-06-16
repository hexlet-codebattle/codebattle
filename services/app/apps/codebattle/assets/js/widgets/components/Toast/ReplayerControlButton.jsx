import React, { useContext, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import GameContext from '../../containers/GameContext';
import i18n from '../../../i18n';
import { actions } from '../../slices';
import { downloadPlaybook, openPlaybook } from '../../middlewares/Game';
import { replayerMachineStates, gameMachineStates } from '../../machines/game';

const ReplayerControlButton = () => {
  const dispatch = useDispatch();
  const { current, send, service } = useContext(GameContext);

  const loadReplayer = useCallback(
    () => dispatch(downloadPlaybook(service)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [service],
  );
  const openLoadedReplayer = useCallback(
    () => dispatch(openPlaybook(service)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [service],
  );

  switch (true) {
    case current.matches({ game: gameMachineStates.stored }): {
      return null;
    }
    case current.matches({ replayer: replayerMachineStates.empty }): {
      return (
        <button
          type="button"
          onClick={loadReplayer}
          className="btn btn-secondary btn-block mb-3 rounded-lg"
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
          onClick={openLoadedReplayer}
          className="btn btn-secondary btn-block mb-3 rounded-lg"
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
          className="btn btn-secondary btn-block mb-3 rounded-lg"
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
