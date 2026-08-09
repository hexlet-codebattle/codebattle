import React from 'react';

import { Box, Flex, Stack } from '@mantine/core';

import Output, { type OutputData } from './Output';
import OutputTab from './OutputTab';
import TaskAssignment, { type TaskAssignmentProps } from './TaskAssignment';
import TimerContainer from './TimerContainer';

interface SideInfoPanelProps {
  taskPanelProps: TaskAssignmentProps;
  outputData: OutputData;
}

function SideInfoPanel({ taskPanelProps, outputData }: SideInfoPanelProps) {
  return (
    <div
      className="d-flex flex-column col-12 col-xl-4 col-lg-6 p-1"
      style={{ height: 'calc(100vh - 92px)' }}
    >
      <div>
        <TaskAssignment {...taskPanelProps} />
      </div>
      <Box
        className="cb-card cb-overflow-y-auto"
        mt="xs"
        style={{ border: 0, boxShadow: 'var(--mantine-shadow-sm)' }}
      >
        <Flex justify="space-around" align="center" w="100%" p="sm">
          <TimerContainer />
          <OutputTab sideOutput={outputData} large />
        </Flex>
        <Stack
          w="100%"
          h="100%"
          gap={0}
          className="cb-overflow-y-auto"
          style={{ userSelect: 'none' }}
        >
          <Output hideContent={taskPanelProps.hideContent} sideOutput={outputData} />
        </Stack>
      </Box>
    </div>
  );
}

export default SideInfoPanel;
