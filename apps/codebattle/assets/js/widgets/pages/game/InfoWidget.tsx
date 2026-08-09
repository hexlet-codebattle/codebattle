import React, { useContext, memo, useState } from 'react';

import { Box, Flex, Tabs } from '@mantine/core';
import i18next from 'i18next';
import { useDispatch, useSelector } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import BattleRoomViewModes from '../../config/battleRoomViewModes';
import { isRestrictedContentSelector, roomStateSelector } from '../../machines/selectors';
import {
  gameTaskSelector,
  gameStatusSelector,
  taskDescriptionLanguageSelector,
} from '../../selectors';
import { actions } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';
import usePlayerOutputForInfoPanel from '../../utils/usePlayerOutputForInfoPanel';

import ChatWidget from './ChatWidget';
import CssBattleInfoPanel from './CssBattleInfoPanel';
import InfoPanel from './InfoPanel';
import { type OutputData } from './Output';
import SideInfoPanel from './SideInfoPanel';
import { type GameTask, type TaskAssignmentProps } from './TaskAssignment';
import TimerContainer from './TimerContainer';

interface CommonBattleInfoWidgetProps {
  viewMode: string;
  task: GameTask | null;
  outputData: OutputData;
  canShowOutput?: boolean | string;
}

function CommonBattleInfoWidget({
  viewMode,
  task,
  outputData,
  canShowOutput,
}: CommonBattleInfoWidgetProps) {
  const dispatch = useDispatch();

  const { mainService } = useContext(RoomContext);
  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);

  const isRestricted = isRestrictedContentSelector(roomMachineState);

  const taskLanguage = useSelector(taskDescriptionLanguageSelector);
  const { tournamentId } = useSelector(gameStatusSelector);

  const handleSetLanguage = (lang: string) => () =>
    dispatch(actions.setTaskDescriptionLanguage(lang));
  const taskPanelProps: TaskAssignmentProps = {
    task: task as GameTask,
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
        <SideInfoPanel taskPanelProps={taskPanelProps} outputData={outputData} />
      )}
    </>
  );
}

// function CssBattleInfoWidget({
//   viewMode,
//   outputData,
//   canShowOutputPanel,
// }) {
interface CssBattleInfoWidgetProps {
  viewMode?: string;
  outputData?: OutputData;
  canShowOutput?: boolean | string;
}

function CssBattleInfoWidget(_props: CssBattleInfoWidgetProps) {
  const idOutput = 'css-battle-output';
  const [activeTab, setActiveTab] = useState<string | null>('task');

  return (
    <>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        <Flex
          direction="column"
          h="100%"
          className="cb-bg-panel cb-text cb-rounded"
          style={{ boxShadow: 'var(--mantine-shadow-sm)' }}
        >
          <Flex
            align="stretch"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              variant="default"
              style={{ flex: '0 0 50%' }}
            >
              <Tabs.List className="text-uppercase font-weight-bold text-center" id="nav-tab">
                <Tabs.Tab
                  value="task"
                  id="task-tab"
                  aria-controls="task"
                  style={{ borderRadius: 0 }}
                  px="xs"
                  py="sm"
                >
                  {i18next.t('Task')}
                </Tabs.Tab>
                <Tabs.Tab
                  value={idOutput}
                  id={`${idOutput}-tab`}
                  aria-controls={idOutput}
                  style={{ borderRadius: 0 }}
                  px="xs"
                  py="sm"
                >
                  {i18next.t('Output')}
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>
            <Box
              flex="0 0 50%"
              ta="center"
              px="xs"
              py="sm"
              style={{ borderLeft: '1px solid var(--mantine-color-default-border)' }}
            >
              <TimerContainer />
            </Box>
          </Flex>

          <Box flex={1} style={{ overflowY: 'auto' }} className="cb-bg-panel cb-text">
            {activeTab === 'task' && (
              <Box id="task" role="tabpanel" aria-labelledby="task-tab" h="100%">
                <CssBattleInfoPanel />
              </Box>
            )}
            {activeTab === idOutput && (
              <Box
                id={idOutput}
                role="tabpanel"
                aria-labelledby={`${idOutput}-tab`}
                h="100%"
                style={{ userSelect: 'none' }}
              >
                {/* {canShowOutputPanel && ( */}
                {/*   <> */}
                {/*     <OutputTab sideOutput={outputData} side="left" /> */}
                {/*     <Output sideOutput={outputData} /> */}
                {/*   </> */}
                {/* )} */}
              </Box>
            )}
          </Box>
        </Flex>
      </div>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        <ChatWidget />
      </div>
    </>
  );
}

interface InfoWidgetProps {
  viewMode: string;
}

function InfoWidget({ viewMode }: InfoWidgetProps) {
  const { mainService } = useContext(RoomContext);
  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);

  const task = useSelector(gameTaskSelector) as GameTask | null;
  const { outputData: rawOutputData, canShowOutput } = usePlayerOutputForInfoPanel(
    viewMode,
    roomMachineState,
  );
  const outputData = (rawOutputData ?? {}) as OutputData;

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
