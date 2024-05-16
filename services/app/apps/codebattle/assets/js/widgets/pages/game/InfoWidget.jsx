import React, { useContext, memo } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import BattleRoomViewModes from '../../config/battleRoomViewModes';
import {
  inTestingRoomSelector,
  isRestrictedContentSelector,
  roomStateSelector,
} from '../../machines/selectors';
import {
  gameTaskSelector,
  gameStatusSelector,
  builderTaskSelector,
  taskDescriptionLanguageSelector,
} from '../../selectors';
import { actions } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';
import usePlayerOutputForInfoPanel from '../../utils/usePlayerOutputForInfoPanel';

import InfoPanel from './InfoPanel';
import SideInfoPanel from './SideInfoPanel';

function InfoWidget({ viewMode }) {
  const dispatch = useDispatch();

  const { mainService } = useContext(RoomContext);
  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);

  const isTestingRoom = inTestingRoomSelector(roomMachineState);
  const isRestricted = isRestrictedContentSelector(roomMachineState);

  const taskLanguage = useSelector(taskDescriptionLanguageSelector);
  const task = useSelector(isTestingRoom ? builderTaskSelector : gameTaskSelector);
  const {
    startsAt,
    timeoutSeconds,
    state: gameStateName,
    mode,
    tournamentId,
  } = useSelector(gameStatusSelector);

  const handleSetLanguage = lang => () => dispatch(actions.setTaskDescriptionLanguage(lang));

  const timerProps = {
    time: startsAt,
    mode,
    timeoutSeconds,
    gameStateName,
  };
  const taskPanelProps = {
    task,
    taskLanguage,
    handleSetLanguage,
    hideContribution: !!tournamentId,
    hideGuide: !!tournamentId,
    hideContent: isRestricted,
  };
  const { outputData, canShowOutput } = usePlayerOutputForInfoPanel(viewMode, roomMachineState);

  return (
    <>
      {viewMode === BattleRoomViewModes.duel && (
        <InfoPanel
          canShowOutputPanel={canShowOutput}
          timerProps={timerProps}
          taskPanelProps={taskPanelProps}
          outputData={outputData}
        />
      )}
      {viewMode === BattleRoomViewModes.single && (
        <SideInfoPanel
          timerProps={timerProps}
          taskPanelProps={taskPanelProps}
          outputData={outputData}
        />
      )}
    </>
  );
}

export default memo(InfoWidget);
