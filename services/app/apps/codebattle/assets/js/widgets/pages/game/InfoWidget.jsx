import React, { useContext, memo } from 'react';

import i18next from 'i18next';
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

import ChatWidget from './ChatWidget';
import CssBattleInfoPanel from './CssBattleInfoPanel';
import InfoPanel from './InfoPanel';
import SideInfoPanel from './SideInfoPanel';
import TimerContainer from './TimerContainer';

function CommonBattleInfoWidget({
  viewMode,
  task,
  outputData,
  canShowOutput,
}) {
  const dispatch = useDispatch();

  const { mainService } = useContext(RoomContext);
  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);

  const isRestricted = isRestrictedContentSelector(roomMachineState);

  const taskLanguage = useSelector(taskDescriptionLanguageSelector);
  const {
    tournamentId,
  } = useSelector(gameStatusSelector);

  const handleSetLanguage = lang => () => dispatch(actions.setTaskDescriptionLanguage(lang));
  const taskPanelProps = {
    task,
    taskLanguage,
    handleSetLanguage,
    hideContribution: !!tournamentId,
    hideContent: isRestricted,
  };

  return (
    <>
      {viewMode === BattleRoomViewModes.duel && (
        <InfoPanel
          canShowOutputPanel={canShowOutput}
          taskPanelProps={taskPanelProps}
          outputData={outputData}
        />
      )}
      {viewMode === BattleRoomViewModes.single && (
        <SideInfoPanel
          taskPanelProps={taskPanelProps}
          outputData={outputData}
        />
      )}
    </>
  );
}

// function CssBattleInfoWidget({
//   viewMode,
//   outputData,
//   canShowOutputPanel,
// }) {
function CssBattleInfoWidget() {
  const idOutput = 'css-battle-output';

  return (
    <>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        <div className="d-flex shadow-sm cb-bg-panel cb-text cb-rounded flex-column h-100">
          <nav>
            <div
              className="nav nav-tabs text-uppercase font-weight-bold text-center"
              id="nav-tab"
              role="tablist"
            >
              <a
                className="nav-item nav-link col-3 border-0 active rounded-0 px-1 py-2"
                id="task-tab"
                data-toggle="tab"
                href="#task"
                role="tab"
                aria-controls="task"
                aria-selected="true"
              >
                {i18next.t('Task')}
              </a>
              <a
                className="nav-item nav-link col-3 border-0 rounded-0 px-1 py-2"
                id={`${idOutput}-tab`}
                data-toggle="tab"
                href={`#${idOutput}`}
                role="tab"
                aria-controls={`${idOutput}`}
                aria-selected="false"
              >
                {i18next.t('Output')}
              </a>
              <div
                className="rounded-0 text-center border-left col-6 px-1 py-2"
              >
                <TimerContainer />
              </div>
            </div>
          </nav>
          <div className="tab-content flex-grow-1 cb-bg-panel cb-text rounded-bottom overflow-auto " id="nav-tabContent">
            <div
              className="tab-pane fade show active h-100"
              id="task"
              role="tabpanel"
              aria-labelledby="task-tab"
            >
              <CssBattleInfoPanel />
            </div>
            <div
              className="tab-pane h-100 user-select-none"
              id={idOutput}
              role="tabpanel"
              aria-labelledby={`${idOutput}-tab`}
            >
              {/* {canShowOutputPanel && ( */}
              {/*   <> */}
              {/*     <OutputTab sideOutput={outputData} side="left" /> */}
              {/*     <Output sideOutput={outputData} /> */}
              {/*   </> */}
              {/* )} */}
            </div>
          </div>
        </div>
      </div>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        <ChatWidget />
      </div>
    </>
  );
}

function InfoWidget({ viewMode }) {
  const { mainService } = useContext(RoomContext);
  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);

  const isTestingRoom = inTestingRoomSelector(roomMachineState);

  const task = useSelector(isTestingRoom ? builderTaskSelector : gameTaskSelector);
  const { outputData, canShowOutput } = usePlayerOutputForInfoPanel(viewMode, roomMachineState);

  if (task?.type === 'css') {
    return (
      <CssBattleInfoWidget
        viewMode={viewMode}
        outputData={outputData}
        canShowOutput={canShowOutput}
      />
    );
  }

  return (
    <CommonBattleInfoWidget
      viewMode={viewMode}
      task={task}
      outputData={outputData}
      canShowOutput={canShowOutput}
    />
  );
}

export default memo(InfoWidget);
