import React, { memo, useState, useEffect } from 'react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch } from 'react-redux';
import { getResults } from '../../middlewares/TournamentAdmin';
import { PanelModeCodes } from '@/pages/tournament/ControlPanel';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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

const getCustomEventTrClassName = () =>
  cn('text-dark font-weight-bold cb-custom-event-tr bg-white');

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
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
  console.log(taskItems)
  const labels = taskItems.map((x) => x.start);
  const lineData = taskItems.map((x) => x.winsCount);

  const taskChartData = {
    labels: labels,
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
      <Line options={options} data={taskChartData} />
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
            {users.map((item) => (
              <React.Fragment
                key={`${PanelModeCodes.topUserByTasksMode}-user-${item.userId}`}
              >
                <tr className="cb-custom-event-empty-space-tr" />
                <tr className={getCustomEventTrClassName()}>
                  <td title={item.userName} className={tableDataCellClassName}>
                    <div
                      className="cb-custom-event-name mr-1"
                      style={{ maxWidth: 220 }}
                    >
                      {item.userName}
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
