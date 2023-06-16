import React, { useContext, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import GameContext from '../../containers/GameContext';
import i18n from '../../../i18n';
import { actions } from '../../slices';
import { downloadPlaybook } from '../../middlewares/Game';
import { replayerMachineStates, gameMachineStates } from '../../machines/game';

const ReplayerControlButton = () => {
  const dispatch = useDispatch();
  const { current, send, service } = useContext(GameContext);
  const handleOpenReplayer = useCallback(() => {
    if (current.matches({ replayer: replayerMachineStates.empty })) {
      dispatch(downloadPlaybook(service));
    } else if (current.matches({ replauer: replayerMachineStates.off })) {
      send('OPEN_REPLAYER');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, service, send]);

  switch (true) {
    case current.matches({ game: gameMachineStates.stored }): {
      return null;
    }
    case current.matches({ replayer: replayerMachineStates.empty }):
    case current.matches({ replayer: replayerMachineStates.off }): {
      return (
        <button
          type="button"
          onClick={handleOpenReplayer}
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
