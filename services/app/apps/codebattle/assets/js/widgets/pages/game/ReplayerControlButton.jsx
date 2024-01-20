import React, { useContext, useCallback } from 'react';

import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import RoomContext from '../../components/RoomContext';
import { replayerMachineStates, roomMachineStates } from '../../machines/game';
import { inPreviewRoomSelector, roomStateSelector } from '../../machines/selectors';
import { downloadPlaybook, openPlaybook } from '../../middlewares/Room';
import { actions } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

function ReplayerControlButton() {
  const dispatch = useDispatch();
  const { mainService } = useContext(RoomContext);
  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);
  const isPreviewRoom = inPreviewRoomSelector(roomMachineState);

  const loadReplayer = useCallback(
    () => dispatch(downloadPlaybook(mainService)),
    [mainService, dispatch],
  );
  const openLoadedReplayer = useCallback(
    () => dispatch(openPlaybook(mainService)),
    [mainService, dispatch],
  );

  switch (true) {
    case roomMachineState.matches({ room: roomMachineStates.testing }):
    case roomMachineState.matches({ room: roomMachineStates.restricted }):
    case roomMachineState.matches({ room: roomMachineStates.stored }): {
      return null;
    }
    case roomMachineState.matches({ replayer: replayerMachineStates.empty }): {
      return (
        <button
          type="button"
          onClick={loadReplayer}
          className="btn btn-secondary btn-block rounded-lg"
          aria-label="Open Record Player"
          disabled={isPreviewRoom}
        >
          {i18n.t('Open History')}
        </button>
      );
    }
    case roomMachineState.matches({ replayer: replayerMachineStates.off }): {
      return (
        <button
          type="button"
          onClick={openLoadedReplayer}
          className="btn btn-secondary btn-block rounded-lg"
          aria-label="Open Record Player"
          disabled={isPreviewRoom}
        >
          {i18n.t('Open History')}
        </button>
      );
    }
    case roomMachineState.matches({ replayer: replayerMachineStates.on }): {
      return (
        <button
          type="button"
          onClick={() => mainService.send('CLOSE_REPLAYER')}
          className="btn btn-secondary btn-block rounded-lg"
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
}

export default ReplayerControlButton;
