import React, { memo, useState, useCallback, useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip } from 'chart.js';
import cn from 'classnames';
import { Bar } from 'react-chartjs-2';
import { useDispatch } from 'react-redux';

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

const getCustomEventTrClassName = () =>
  cn('cb-text-light font-weight-bold cb-custom-event-tr cb-bg-panel');

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0 cb-text',
);

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
    <div className="d-flex flex-column h-100 cb-task-advanced-panel">
      <div className="p-2">
        <div className="cb-task-advanced-card cb-task-advanced-chart">
          <div className="cb-task-advanced-card-title">{i18next.t('Duration distribution')}</div>
          <Bar options={options} data={taskChartData} />
        </div>
      </div>
      <div className="p-2 flex-grow-1">
        <div className="cb-task-advanced-card cb-overflow-x-auto cb-overflow-y-auto">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="cb-task-advanced-card-title">
              {i18next.t('Top users by task')}
              {task?.name ? `, ${task.name}` : ''}
            </div>
            <div className="custom-control custom-switch">
              <input
                id="task-params-view"
                aria-label={i18next.t('Show task description')}
                type="checkbox"
                className="custom-control-input"
                checked={mode}
                onChange={handleChangeMode}
              />
              <label className="custom-control-label" htmlFor="task-params-view">
                {i18next.t('Show task description')}
              </label>
            </div>
          </div>
          {mode ? (
            <div className="cb-overflow-y-auto">
              <TaskDescriptionMarkdown description={task.descriptionEn ?? ''} />
              <TaskDescriptionMarkdown description={task.descriptionRu ?? ''} />
            </div>
          ) : (
            <table className="table cb-custom-event-table cb-task-advanced-table">
              <thead className="text-muted">
                <tr>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Player')}</th>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Clan')}</th>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Score')}</th>
                  <th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Duration (sec)')}
                  </th>
                  <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Link')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <React.Fragment key={`${PanelModeCodes.topUserByTasksMode}-user-${item.userId}`}>
                    <tr className={getCustomEventTrClassName()}>
                      <td className={tableDataCellClassName}>
                        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                        <div
                          role="button"
                          tabIndex={0}
                          className="cb-custom-event-name mr-1 text-secondary"
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
                            linkClassName="text-secondary"
                          />
                        </div>
                      </td>
                      <td title={item.clanLongName} className={tableDataCellClassName}>
                        <div className="cb-custom-event-name mr-1" style={{ maxWidth: 220 }}>
                          {item.clanName}
                        </div>
                      </td>
                      <td width="100" className={tableDataCellClassName}>
                        {item.score}
                      </td>
                      <td width="100" className={tableDataCellClassName}>
                        {item.durationSec}
                      </td>
                      <td className={tableDataCellClassName}>
                        <a className="cb-task-advanced-link" href={`/games/${item.gameId}`}>
                          <FontAwesomeIcon icon="link" className="mr-1" />
                        </a>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(TaskRankingAdvancedPanel);
