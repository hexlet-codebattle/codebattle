import React, { memo, useState, useCallback } from 'react';

import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bubble } from 'react-chartjs-2';
import { useDispatch } from 'react-redux';

import { getResults } from '../../middlewares/TournamentAdmin';

import useTournamentPanel from './useTournamentPanel';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

function ClansChartPanel({ type, state }) {
  const dispatch = useDispatch();

  const [items, setItems] = useState([]);

  const fetchData = useCallback(
    () => dispatch(getResults(type, undefined, setItems)),
    [setItems, dispatch, type],
  );

  useTournamentPanel(fetchData, state);

  const colors = [
    '#FF621E',
    '#2AE881',
    '#FFE500',
    '#B6A4FF',
    '#73CCFE',
    '#FF9C41',
  ];

  const getBackgroundColor = id => {
    const index = id % colors.length;
    return colors[index];
  };

  const config = {
    data: {
      datasets: items.map(item => ({
        label: `${item?.clanName || 'undefined'} [${item?.playerCount || 0}]`,
        data: [
          {
            x: item?.totalScore || 0,
            y: item?.performance || 0,
            r: item?.radius < 3 ? 3 : item?.radius || 3,
          },
        ],
        backgroundColor: getBackgroundColor(item?.clanId),
      })),
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
      },
    },
  };

  return (
    <div className="my-2 px-1 mt-lg-0 rounded-lg position-relative cb-overflow-x-auto cb-overflow-y-auto">
      <Bubble data={config.data} options={config.options} />
    </div>
  );
}

export default memo(ClansChartPanel);
