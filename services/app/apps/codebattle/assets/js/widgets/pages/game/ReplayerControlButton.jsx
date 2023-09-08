import React, { useContext, useCallback } from 'react';

import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import RoomContext from '../../components/RoomContext';
import { replayerMachineStates, roomMachineStates } from '../../machines/game';
import { inPreviewRoomSelector, roomStateSelector } from '../../machines/selectors';
import { downloadPlaybook, openPlaybook } from '../../middlewares/Game';
import { actions } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

function ReplayerControlButton() {
  const dispatch = useDispatch();
  const { mainService } = useContext(RoomContext);
  const roomCurrent = useMachineStateSelector(mainService, roomStateSelector);
  const isPreviewRoom = inPreviewRoomSelector(roomCurrent);

  const loadReplayer = useCallback(
    () => dispatch(downloadPlaybook(mainService)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mainService],
  );
  const openLoadedReplayer = useCallback(
    () => dispatch(openPlaybook(mainService)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mainService],
  );

  switch (true) {
    case roomCurrent.matches({ room: roomMachineStates.testing }):
    case roomCurrent.matches({ room: roomMachineStates.stored }): {
      return null;
    }
    case roomCurrent.matches({ replayer: replayerMachineStates.empty }): {
      return (
        <button
          aria-label="Open Record Player"
          className="btn btn-secondary btn-block rounded-lg"
          disabled={isPreviewRoom}
          type="button"
          onClick={loadReplayer}
        >
          {i18n.t('Open History')}
        </button>
      );
    }
    case roomCurrent.matches({ replayer: replayerMachineStates.off }): {
      return (
        <button
          aria-label="Open Record Player"
          className="btn btn-secondary btn-block rounded-lg"
          disabled={isPreviewRoom}
          type="button"
          onClick={openLoadedReplayer}
        >
          {i18n.t('Open History')}
        </button>
      );
    }
    case roomCurrent.matches({ replayer: replayerMachineStates.on }): {
      return (
        <button
          aria-label="Close Record Player"
          className="btn btn-secondary btn-block rounded-lg"
          type="button"
          onClick={() => mainService.send('CLOSE_REPLAYER')}
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
}

export default ReplayerControlButton;
