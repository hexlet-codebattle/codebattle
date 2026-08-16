import React, { useContext, useCallback } from 'react';

import { Button } from '@mantine/core';
import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import RoomContext from '../../components/RoomContext';
import { replayerMachineStates, roomMachineStates } from '../../machines/game';
import { inPreviewRoomSelector, roomStateSelector } from '../../machines/selectors';
import { downloadPlaybook, openPlaybook } from '../../middlewares/Room';
import { actions, type AppDispatch } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

// xstate v4 interpreter has no usable exported type here (rule 7)
interface RoomContextValue {
  mainService: any;
}

function ReplayerControlButton() {
  const dispatch = useDispatch<AppDispatch>();
  const { mainService } = useContext(RoomContext) as RoomContextValue;
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
  const closeReplayer = useCallback(
    () => mainService.send({ type: 'CLOSE_REPLAYER' }),
    [mainService],
  );

  switch (true) {
    case roomMachineState.matches({ room: roomMachineStates.restricted }):
    case roomMachineState.matches({ room: roomMachineStates.stored }): {
      return null;
    }
    case roomMachineState.matches({ replayer: replayerMachineStates.empty }): {
      return (
        <Button
          color="cbSecondary"
          radius="md"
          fullWidth
          onClick={loadReplayer}
          aria-label={i18n.t('Open Record Player')}
          disabled={isPreviewRoom}
        >
          {i18n.t('Open History')}
        </Button>
      );
    }
    case roomMachineState.matches({ replayer: replayerMachineStates.off }): {
      return (
        <Button
          color="cbSecondary"
          radius="md"
          fullWidth
          onClick={openLoadedReplayer}
          aria-label={i18n.t('Open Record Player')}
          disabled={isPreviewRoom}
        >
          {i18n.t('Open History')}
        </Button>
      );
    }
    case roomMachineState.matches({ replayer: replayerMachineStates.on }): {
      return (
        <Button
          color="cbSecondary"
          radius="md"
          fullWidth
          onClick={closeReplayer}
          aria-label={i18n.t('Close Record Player')}
        >
          {i18n.t('Return to game')}
        </Button>
      );
    }
    default: {
      dispatch(actions.setError(new Error('unnexpected game machine state [ReplayerButton]')));
      return null;
    }
  }
}

export default ReplayerControlButton;
