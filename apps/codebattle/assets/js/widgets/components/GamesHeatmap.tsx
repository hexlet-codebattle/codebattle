import React, { useState, useEffect } from 'react';

import { Card } from '@mantine/core';
import CalendarHeatmap, { type ReactCalendarHeatmapValue } from 'react-calendar-heatmap';
import { useDispatch } from 'react-redux';

import { actions } from '../slices';

import Loading from './Loading';

interface GamesHeatmapComponent extends React.FC {
  colorScale: (count: number) => string;
}

const GamesHeatmap: GamesHeatmapComponent = () => {
  const [activities, setActivities] = useState<ReactCalendarHeatmapValue[] | null>(null);

  const dispatch = useDispatch();

  useEffect(() => {
    fetch('/api/v1/game_activity')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        setActivities(data.activities);
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
  }, [dispatch]);

  if (!activities) {
    return <Loading />;
  }
  return (
    <Card withBorder radius="sm" px="lg" py={0}>
      <CalendarHeatmap
        showWeekdayLabels
        values={activities}
        classForValue={(value) => {
          if (!value) {
            return 'color-empty';
          }
          return GamesHeatmap.colorScale(value.count ?? 0);
        }}
        titleForValue={(value) => {
          if (!value) {
            return 'No games';
          }
          return `${value.count} games on ${value.date}`;
        }}
      />
    </Card>
  );
};

GamesHeatmap.colorScale = (count: number) => {
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
