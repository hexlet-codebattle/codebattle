import React, { useState } from 'react';

import { Box, Tabs } from '@mantine/core';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import * as selectors from '../../selectors';

import ChatWidget from './ChatWidget';
import Output, { type OutputData } from './Output';
import OutputTab from './OutputTab';
import TaskAssignment, { type TaskAssignmentProps } from './TaskAssignment';
import TimerContainer from './TimerContainer';
import TournamentCurrentPlayerRankingPanel from './TournamentCurrentPlayerRankingPanel';

interface InfoPanelProps {
  idOutput?: string;
  canShowOutputPanel?: boolean | string;
  outputData: OutputData;
  taskPanelProps: TaskAssignmentProps;
}

function InfoPanel({
  idOutput = 'leftOutput',
  canShowOutputPanel,
  outputData,
  taskPanelProps,
}: InfoPanelProps) {
  const { tournamentId } = useSelector(selectors.gameStatusSelector);
  const isTournamentGame = !!tournamentId;

  const [activeTab, setActiveTab] = useState<string | null>('task');

  return (
    <>
      <Box w={{ base: '100%', lg: '50%' }} p="xs" miw={0} mih={300} h={{ base: 'auto', xs: 300 }}>
        <Box
          bg="cbPanel"
          h="100%"
          style={{
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--mantine-shadow-sm)',
            borderRadius: 'var(--mantine-radius-md)',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            keepMounted
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <Tabs.List
              style={{
                textTransform: 'uppercase',
                fontWeight: 700,
                textAlign: 'center',
              }}
              id="nav-tab"
            >
              <Tabs.Tab
                value="task"
                id="task-tab"
                aria-controls="task"
                c="white"
                style={{ flex: '0 0 25%', borderRadius: 0 }}
                px="xs"
                py="sm"
              >
                {i18next.t('Task')}
              </Tabs.Tab>
              <Tabs.Tab
                value={idOutput}
                id={`${idOutput}-tab`}
                aria-controls={idOutput}
                style={{ flex: '0 0 25%', borderRadius: 0 }}
                c="white"
                px="xs"
                py="sm"
              >
                {i18next.t('Output')}
              </Tabs.Tab>
              <Box
                style={{
                  flex: '0 0 50%',
                  textAlign: 'center',
                  borderLeft: '1px solid var(--mantine-color-default-border)',
                  position: 'relative',
                }}
                c="white"
                px="xs"
                py="sm"
              >
                <TimerContainer />
              </Box>
            </Tabs.List>

            <Tabs.Panel
              value="task"
              id="task"
              role="tabpanel"
              aria-labelledby="task-tab"
              c="white"
              style={{
                flexGrow: 1,
                overflow: 'auto',
                borderRadius: '0 0 var(--mantine-radius-md) var(--mantine-radius-md)',
              }}
            >
              <TaskAssignment {...taskPanelProps} />
            </Tabs.Panel>
            <Tabs.Panel
              value={idOutput}
              id={idOutput}
              role="tabpanel"
              aria-labelledby={`${idOutput}-tab`}
              h="100%"
              style={{ userSelect: 'none' }}
            >
              {canShowOutputPanel && (
                <>
                  <OutputTab sideOutput={outputData} side="left" />
                  <Output sideOutput={outputData} />
                </>
              )}
            </Tabs.Panel>
          </Tabs>
        </Box>
      </Box>
      <Box w={{ base: '100%', lg: '50%' }} p="xs" miw={0} mih={300} h={{ base: 'auto', xs: 300 }}>
        {isTournamentGame ? <TournamentCurrentPlayerRankingPanel /> : <ChatWidget />}
      </Box>
    </>
  );
}

export default InfoPanel;
