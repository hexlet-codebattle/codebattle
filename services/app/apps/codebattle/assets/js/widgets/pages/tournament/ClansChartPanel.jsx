import React, {
  memo, useState, useEffect,
} from 'react';

import { Bubble } from 'react-chartjs-2';
import { useDispatch } from 'react-redux';

import { getResults } from '../../middlewares/TournamentAdmin';

function ClansChartPanel({ type, state }) {
  const dispatch = useDispatch();

  const [items, setItems] = useState({ results: [] });

  console.log(items)
  useEffect(() => {
    if (state === 'active') {
      dispatch(getResults(type, undefined, setItems));
      const interval = setInterval(() => {
        dispatch(getResults(type, undefined, setItems));
      }, 1000 * 30);

      return () => {
        clearInterval(interval);
      };
    }

    if (state === 'finished') {
      dispatch(getResults(type, undefined, setItems));
    }

    return () => {};
  }, [setItems, dispatch, type, state]);

  const config = {
    data: {
      datasets: items.results.map(item => ({
        label: `${item.clanName} [${item.playerCount}]`,
        data: [{
          x: item.totalScore,
          y: item.performance,
          z: item.radius,
        }],
        backgroundColor: `rgb(255, ${item.clanId}, 132)`,
      })),
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: false,
      },
      elements: {
        point: {},
      },
    },
  };

  return (
    <div className="my-2 px-1 mt-lg-0 sticky-top rounded-lg position-relative cb-overflow-x-auto cb-overflow-y-auto">
      <Bubble
        data={config.data}
        options={config.options}
      />
    </div>
  );
}

export default memo(ClansChartPanel);
