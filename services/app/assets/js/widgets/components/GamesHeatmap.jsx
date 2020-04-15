import React, { useState, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import axios from 'axios';
import Loading from './Loading';

const GamesHeatmap = () => {
  const [activities, setActivities] = useState(null);

  useEffect(() => {
    axios.get('/api/v1/game_activity')
      .then(response => { setActivities(response.data.activities); });
  }, []);

  if (!activities) {
    return (<Loading />);
  }
  return (
    <div className="card rounded">
      <div className="card-body py-0 my-0">
        <CalendarHeatmap
          showWeekdayLabels
          values={activities}
          classForValue={value => {
            if (!value) {
              return 'color-empty';
            }
            return GamesHeatmap.colorScale(value.count);
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
GamesHeatmap.colorScale = count => {
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
export default GamesHeatmap;
