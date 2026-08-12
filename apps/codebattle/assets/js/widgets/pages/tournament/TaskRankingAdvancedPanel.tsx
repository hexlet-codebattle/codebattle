import React, { memo, useState, useCallback, useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useDispatch } from 'react-redux';

import { Box, Flex, Switch, Table, Text } from '@mantine/core';

import { type AppDispatch } from '@/slices';

import { PanelModeCodes } from '@/pages/tournament/ControlPanel';

import i18next from '../../../i18n';
import UserInfo from '../../components/UserInfo';
import { getResults, getTask } from '../../middlewares/Tournament';
import TaskDescriptionMarkdown from '../game/TaskDescriptionMarkdown';

import useTournamentPanel from './useTournamentPanel';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

// chart.js option objects are typed loosely here; the lib's option types fight
// the plain-object literal shape used below.
const options: any = {
  responsive: true,
  plugins: {
    legend: false,
    title: {
      display: true,
      text: i18next.t('Task duration distribution'),
      color: '#cbd5e1',
      font: {
        size: 13,
        weight: '600',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#e2e8f0',
      bodyColor: '#cbd5e1',
      borderColor: 'rgba(148, 163, 184, 0.2)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8' },
      grid: { color: 'rgba(148, 163, 184, 0.08)' },
    },
    y: {
      ticks: { color: '#94a3b8' },
      grid: { color: 'rgba(148, 163, 184, 0.08)' },
    },
  },
};

interface TaskRankingAdvancedPanelProps {
  taskId: number;
  state: string;
  handleUserSelectClick: (event: React.MouseEvent | React.KeyboardEvent) => void;
}

interface TaskInfo {
  name?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  [key: string]: unknown;
}

interface TaskUser {
  userId: number;
  userName: string;
  clanName?: string;
  clanLongName?: string;
  score: number;
  durationSec: number;
  gameId: number;
}

interface TaskDurationItem {
  start: number;
  winsCount: number;
}

function TaskRankingAdvancedPanel({
  taskId,
  state,
  handleUserSelectClick,
}: TaskRankingAdvancedPanelProps) {
  const dispatch = useDispatch<AppDispatch>();

  const [mode, setMode] = useState(false);
  const [task, setTask] = useState<TaskInfo>({});
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [taskItems, setTaskItems] = useState<TaskDurationItem[]>([]);

  const handleChangeMode = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setMode(event.target.checked);
    },
    [setMode],
  );

  const fetchData = useCallback(() => {
    dispatch(getResults(PanelModeCodes.topUserByTasksMode, { taskId }, setUsers));
    dispatch(getResults(PanelModeCodes.taskDurationDistributionMode, { taskId }, setTaskItems));
  }, [setUsers, setTaskItems, dispatch, taskId]);

  useEffect(() => {
    dispatch(getTask(taskId, setTask));
  }, [taskId, setTask, dispatch]);

  useTournamentPanel(fetchData, state);

  const labels = taskItems.map((x) => x.start);
  const lineData = taskItems.map((x) => x.winsCount);

  const taskChartData = {
    labels,
    datasets: [
      {
        data: lineData,
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.45)',
      },
    ],
  };

  return (
    <Flex direction="column" h="100%" className="cb-task-advanced-panel">
      <Box p="xs">
        <Box className="cb-task-advanced-card cb-task-advanced-chart">
          <Text className="cb-task-advanced-card-title">{i18next.t('Duration distribution')}</Text>
          <Bar options={options} data={taskChartData} />
        </Box>
      </Box>
      <Box p="xs" flex={1}>
        <Box className="cb-task-advanced-card cb-overflow-x-auto cb-overflow-y-auto">
          <Flex align="center" justify="space-between" mb="xs">
            <Text className="cb-task-advanced-card-title">
              {i18next.t('Top users by task')}
              {task?.name ? `, ${task.name}` : ''}
            </Text>
            <Switch
              id="task-params-view"
              aria-label={i18next.t('Show task description')}
              label={i18next.t('Show task description')}
              checked={mode}
              onChange={handleChangeMode}
            />
          </Flex>
          {mode ? (
            <div className="cb-overflow-y-auto">
              <TaskDescriptionMarkdown description={task.descriptionEn ?? ''} />
              <TaskDescriptionMarkdown description={task.descriptionRu ?? ''} />
            </div>
          ) : (
            <Table className="cb-custom-event-table cb-task-advanced-table">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th c="dimmed" fw={300} p={4} pl={24}>
                    {i18next.t('Player')}
                  </Table.Th>
                  <Table.Th c="dimmed" fw={300} p={4} pl={24}>
                    {i18next.t('Clan')}
                  </Table.Th>
                  <Table.Th c="dimmed" fw={300} p={4} pl={24}>
                    {i18next.t('Score')}
                  </Table.Th>
                  <Table.Th c="dimmed" fw={300} p={4} pl={24}>
                    {i18next.t('Duration (sec)')}
                  </Table.Th>
                  <Table.Th c="dimmed" fw={300} p={4} pl={24}>
                    {i18next.t('Link')}
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((item) => (
                  <React.Fragment key={`${PanelModeCodes.topUserByTasksMode}-user-${item.userId}`}>
                    <Table.Tr className="cb-text-light cb-custom-event-tr cb-bg-panel" fw={700}>
                      <Table.Td
                        className="cb-custom-event-td cb-text"
                        p={4}
                        pl={24}
                        style={{ whiteSpace: 'nowrap', position: 'relative' }}
                      >
                        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                        <Box
                          role="button"
                          tabIndex={0}
                          className="cb-custom-event-name"
                          mr="xs"
                          c="dimmed"
                          style={{ maxWidth: 220 }}
                          onClick={handleUserSelectClick}
                          onKeyPress={handleUserSelectClick}
                          data-user-id={item.userId}
                          data-user-name={item.userName}
                        >
                          <UserInfo
                            user={{ id: item.userId, name: item.userName }}
                            hideOnlineIndicator
                            hideLink
                            color="#6c757d"
                          />
                        </Box>
                      </Table.Td>
                      <Table.Td
                        title={item.clanLongName}
                        className="cb-custom-event-td cb-text"
                        p={4}
                        pl={24}
                        style={{ whiteSpace: 'nowrap', position: 'relative' }}
                      >
                        <Box className="cb-custom-event-name" mr="xs" style={{ maxWidth: 220 }}>
                          {item.clanName}
                        </Box>
                      </Table.Td>
                      <Table.Td
                        w={100}
                        className="cb-custom-event-td cb-text"
                        p={4}
                        pl={24}
                        style={{ whiteSpace: 'nowrap', position: 'relative' }}
                      >
                        {item.score}
                      </Table.Td>
                      <Table.Td
                        w={100}
                        className="cb-custom-event-td cb-text"
                        p={4}
                        pl={24}
                        style={{ whiteSpace: 'nowrap', position: 'relative' }}
                      >
                        {item.durationSec}
                      </Table.Td>
                      <Table.Td
                        className="cb-custom-event-td cb-text"
                        p={4}
                        pl={24}
                        style={{ whiteSpace: 'nowrap', position: 'relative' }}
                      >
                        <Text
                          component="a"
                          className="cb-task-advanced-link"
                          href={`/games/${item.gameId}`}
                          mr="xs"
                        >
                          <FontAwesomeIcon icon="link" />
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  </React.Fragment>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Box>
      </Box>
    </Flex>
  );
}

export default memo(TaskRankingAdvancedPanel);
