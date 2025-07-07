import React, {
 memo, useState, useCallback, useEffect,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import cn from 'classnames';
import { Bar } from 'react-chartjs-2';
import { useDispatch } from 'react-redux';

import { PanelModeCodes } from '@/pages/tournament/ControlPanel';

import i18next from '../../../i18n';
import UserInfo from '../../components/UserInfo';
import { getResults, getTask } from '../../middlewares/TournamentAdmin';
import TaskDescriptionMarkdown from '../game/TaskDescriptionMarkdown';

import useTournamentPanel from './useTournamentPanel';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

const options = {
  responsive: true,
  plugins: {
    legend: false,
    title: {
      display: true,
      text: i18next.t('Task duration distribution'),
    },
  },
};

const getCustomEventTrClassName = () => cn('text-dark font-weight-bold cb-custom-event-tr bg-white');

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0 cb-custom-event-bg-purple',
);

function TaskRankingAdvancedPanel({ taskId, state, handleUserSelectClick }) {
  const dispatch = useDispatch();

  const [mode, setMode] = useState(false);
  const [task, setTask] = useState({});
  const [users, setUsers] = useState([]);
  const [taskItems, setTaskItems] = useState([]);

  const handleChangeMode = useCallback(
    event => {
      setMode(event.target.checked);
    },
    [setMode],
  );

  const fetchData = useCallback(() => {
    dispatch(
      getResults(PanelModeCodes.topUserByTasksMode, { taskId }, setUsers),
    );
    dispatch(
      getResults(
        PanelModeCodes.taskDurationDistributionMode,
        { taskId },
        setTaskItems,
      ),
    );
  }, [setUsers, setTaskItems, dispatch, taskId]);

  useEffect(() => {
    dispatch(getTask(taskId, setTask));
  }, [taskId, setTask, dispatch]);

  useTournamentPanel(fetchData, state);

  const labels = taskItems.map(x => x.start);
  const lineData = taskItems.map(x => x.winsCount);

  const taskChartData = {
    labels,
    datasets: [
      {
        data: lineData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  return (
    <div className="d-flex h-100">
      <div className="w-50 p-2">
        <Bar options={options} data={taskChartData} />
      </div>
      <div className="w-50 p-2 my-2 px-1 mt-lg-0 rounded-lg position-relative cb-overflow-x-auto cb-overflow-y-auto">
        <div className="m-1 custom-control custom-switch">
          <input
            id="task-params-view"
            type="checkbox"
            className="custom-control-input"
            checked={mode}
            onChange={handleChangeMode}
          />
          <label className="custom-control-label" htmlFor="task-params-view">
            {i18next.t('Show task description')}
          </label>
        </div>
        <p>{task.name}</p>
        {mode ? (
          <div className="cb-overflow-y-auto">
            <TaskDescriptionMarkdown description={task.descriptionEn} />
            <TaskDescriptionMarkdown description={task.descriptionRu} />
          </div>
        ) : (
          <table className="table table-striped cb-custom-event-table">
            <thead className="text-muted">
              <tr>
                <th className="p-1 pl-4 font-weight-light border-0">
                  {i18next.t('User')}
                </th>
                <th className="p-1 pl-4 font-weight-light border-0">
                  {i18next.t('Clan')}
                </th>
                <th className="p-1 pl-4 font-weight-light border-0">
                  {i18next.t('Score')}
                </th>
                <th className="p-1 pl-4 font-weight-light border-0">
                  {i18next.t('Duration (sec)')}
                </th>
                <th className="p-1 pl-4 font-weight-light border-0"> </th>
              </tr>
            </thead>
            <tbody>
              {users.map(item => (
                <React.Fragment
                  key={`${PanelModeCodes.topUserByTasksMode}-user-${item.userId}`}
                >
                  <tr className="cb-custom-event-empty-space-tr" />
                  <tr className={getCustomEventTrClassName()}>
                    <td className={tableDataCellClassName}>
                      <div
                        role="button"
                        tabIndex={0}
                        className="cb-custom-event-name mr-1"
                        style={{ maxWidth: 220 }}
                        onClick={handleUserSelectClick}
                        onKeyPress={handleUserSelectClick}
                        data-user-id={item.userId}
                      >
                        <UserInfo
                          user={{ id: item.userId, name: item.userName }}
                          hideOnlineIndicator
                          hideLink
                        />
                      </div>
                    </td>
                    <td
                      title={item.clanLongName}
                      className={tableDataCellClassName}
                    >
                      <div
                        className="cb-custom-event-name mr-1"
                        style={{ maxWidth: 220 }}
                      >
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
                      <a
                        className="text-primary"
                        href={`/games/${item.gameId}`}
                      >
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
  );
}

export default memo(TaskRankingAdvancedPanel);
