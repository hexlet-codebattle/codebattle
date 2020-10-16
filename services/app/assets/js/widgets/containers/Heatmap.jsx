import React, { useState, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import Loading from '../components/Loading';

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

const Heatmap = () => {
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
        dispatch({ type: 'FETCH_USER_ACTIVITY_ERROR', error: true, payload: error });
      });
  }, [setActivities, dispatch]);

  if (!activities) {
    return <Loading />;
  }

  return (
    <div className="card rounded">
      <div className="d-flex my-0 py-1 justify-content-center card-header font-weight-bold">
        Activity
      </div>
      <div className="card-body py-0 my-0">
        <CalendarHeatmap
          showWeekdayLabels
          values={activities}
          classForValue={value => {
            if (!value) {
              return 'color-empty';
            }
            return getColorScale(value.count);
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
};

export default Heatmap;
