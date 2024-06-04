import React, { memo, useState, useEffect } from 'react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import cn from 'classnames';
import i18next from 'i18next';
import { Bar } from 'react-chartjs-2';
import { useDispatch } from 'react-redux';

import { PanelModeCodes } from '@/pages/tournament/ControlPanel';

import UserInfo from '../../components/UserInfo';
import { getResults } from '../../middlewares/TournamentAdmin';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
);

const options = {
  responsive: true,
  plugins: {
    legend: false,
    title: {
      display: true,
      text: 'Task duration distribution',
    },
  },
};

const getCustomEventTrClassName = () => cn('text-dark font-weight-bold cb-custom-event-tr bg-white');

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0 cb-custom-event-bg-purple',
);

function TaskRankingAdvancedPanel({ taskId, state }) {
  const dispatch = useDispatch();

  const [users, setUsers] = useState([]);
  const [taskItems, setTaskItems] = useState([]);

  useEffect(() => {
    if (state === 'active') {
      dispatch(getResults(PanelModeCodes.topUserByTasksMode, taskId, setUsers));
      dispatch(
        getResults(
          PanelModeCodes.taskDurationDistributionMode,
          taskId,
          setTaskItems,
        ),
      );

      const interval = setInterval(() => {
        dispatch(
          getResults(PanelModeCodes.topUserByTasksMode, taskId, setUsers),
        );
        dispatch(
          getResults(
            PanelModeCodes.taskDurationDistributionMode,
            taskId,
            setTaskItems,
          ),
        );
      }, 1000 * 15);

      return () => {
        clearInterval(interval);
      };
    }

    if (state === 'finished') {
      dispatch(getResults(PanelModeCodes.topUserByTasksMode, taskId, setUsers));
      dispatch(
        getResults(
          PanelModeCodes.taskDurationDistributionMode,
          taskId,
          setTaskItems,
        ),
      );
    }

    return () => {};
  }, [setUsers, setTaskItems, dispatch, taskId, state]);
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
    <div className="d-flex">
      <div className="w-50">
        <Bar options={options} data={taskChartData} />
      </div>
      <div className="w-50 my-2 px-1 mt-lg-0 sticky-top rounded-lg position-relative cb-overflow-x-auto cb-overflow-y-auto">
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
                {i18next.t('Duration (sec)')}
              </th>
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
                      className="cb-custom-event-name mr-1"
                      style={{ maxWidth: 220 }}
                    >
                      <UserInfo
                        user={{ id: item.userId, name: item.userName }}
                        hideOnlineIndicator
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
                  <td width="120" className={tableDataCellClassName}>
                    {item.durationSec}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(TaskRankingAdvancedPanel);
