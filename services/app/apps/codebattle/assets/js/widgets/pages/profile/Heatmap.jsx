import React, { useState, useEffect } from 'react';

import axios from 'axios';
import CalendarHeatmap from 'react-calendar-heatmap';
import { useDispatch } from 'react-redux';

import Loading from '../../components/Loading';
import { actions } from '../../slices';

const getColorScale = count => {
  if (count >= 5) {
    return 'color-huge';
  }
  if (count >= 3) {
    return 'color-large';
  }
  if (count >= 1) {
    return 'color-small';
  }
  return 'color-empty';
};

function Heatmap() {
  const [activities, setActivities] = useState(null);

  const dispatch = useDispatch();

  useEffect(() => {
    const userId = window.location.pathname.split('/').pop();
    axios
      .get(`/api/v1/${userId}/activity`)
      .then(response => {
        setActivities(response.data.activities);
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  }, [setActivities, dispatch]);

  if (!activities) {
    return <Loading />;
  }

  return (
    <div className="card cb-card">
      <div className="card-header py-1 cb-bg-highlight-panel font-weight-bold text-center">
        Activity
      </div>
      <div className="card-body pt-3 pr-3 pb-0 pl-2 cb-heatmap-background">
        <CalendarHeatmap
          showWeekdayLabels
          values={activities}
          classForValue={value => {
            if (!value) {
              return 'color-empty text-white';
            }
            return `${getColorScale(value.count)} text-white`;
          }}
          titleForValue={value => {
            if (!value) {
              return 'No games';
            }
            return `${value.count} games on ${value.date}`;
          }}
        />
      </div>
    </div>
  );
}

export default Heatmap;
