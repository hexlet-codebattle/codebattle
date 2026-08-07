import React, { cloneElement, useEffect, useMemo, useRef, useState } from 'react';

import { Box, Flex, NativeSelect } from '@mantine/core';
import CalendarHeatmap, { type ReactCalendarHeatmapValue } from 'react-calendar-heatmap';
import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import dayjs from '../../../i18n/dayjs';
import Loading from '../../components/Loading';
import { actions } from '../../slices';

const firstSupportedYear = 2017;
const latestValue = 'latest';

interface ActivityValue {
  count: number;
  date: string;
}

interface ActivityMeta {
  end_date: string;
  start_date: string;
  year?: number;
}

interface ActivityData {
  activities: ActivityValue[];
  meta: ActivityMeta;
}

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

const getColorScale = (count: number) => {
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
  const dispatch = useDispatch();
  const userId = useMemo(() => window.location.pathname.split('/').pop(), []);
  const currentYear = dayjs().year();
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(latestValue);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const years = useMemo(
    () =>
      Array.from(
        { length: currentYear - firstSupportedYear + 1 },
        (_, index) => currentYear - index,
      ),
    [currentYear],
  );

  useEffect(() => {
    setIsLoading(true);

    const query = new URLSearchParams(
      selectedPeriod === latestValue ? {} : { year: String(Number(selectedPeriod)) },
    ).toString();

    fetch(`/api/v1/${userId}/activity${query ? `?${query}` : ''}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
        setActivityData(data);
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [dispatch, selectedPeriod, userId]);

  if (!activityData || (isLoading && !activityData.meta)) {
    return <Loading />;
  }

  const { activities, meta } = activityData;
  const totalGames = activities.reduce((sum, activity) => sum + activity.count, 0);
  const title = meta.year
    ? i18n.t('%{count} games in %{year}', { count: totalGames, year: meta.year })
    : i18n.t('%{count} games in the last 365 days', { count: totalGames });
  const range = `${dayjs(meta.start_date).format('MMM D, YYYY')} - ${dayjs(meta.end_date).format('MMM D, YYYY')}`;

  const showTooltip = (
    event: React.SyntheticEvent<HTMLElement>,
    value: ReactCalendarHeatmapValue | null | undefined,
  ) => {
    const wrapperRect = gridWrapperRef.current?.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();

    if (!wrapperRect) {
      return;
    }

    setTooltip({
      text: value
        ? i18n.t('%{count} games on %{date}', { count: value.count, date: value.date })
        : i18n.t('No games'),
      x: targetRect.left - wrapperRect.left + targetRect.width / 2,
      y: targetRect.top - wrapperRect.top - 8,
    });
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <div className="cb-profile-heatmap">
      <Flex
        direction={{ base: 'column', lg: 'row' }}
        align="center"
        justify="space-between"
        mb="md"
      >
        <Box display={{ base: 'none', lg: 'block' }} w={176} aria-hidden="true" />
        <Box
          className="cb-profile-heatmap-heading"
          mb={{ base: 'md', lg: 0 }}
          style={{ flexGrow: 1 }}
        >
          <div className="cb-profile-heatmap-title">
            <span>{title}</span>
            <span className="cb-profile-heatmap-separator">•</span>
            <span className="cb-profile-heatmap-range">{range}</span>
          </div>
        </Box>
        <Flex className="cb-profile-heatmap-controls" justify={{ base: 'center', lg: 'flex-end' }}>
          <NativeSelect
            id="heatmap-year-select"
            classNames={{ input: 'cb-profile-heatmap-select' }}
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(event.target.value)}
            disabled={isLoading}
          >
            <option value={latestValue}>{i18n.t('Last 365 days')}</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </NativeSelect>
        </Flex>
      </Flex>

      <div className="cb-profile-heatmap-grid-wrapper" ref={gridWrapperRef}>
        {isLoading && (
          <div className="cb-profile-heatmap-overlay">
            <Loading small />
          </div>
        )}
        {tooltip && (
          <div
            className="cb-profile-heatmap-tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            {tooltip.text}
          </div>
        )}
        <div className="cb-profile-heatmap-grid">
          <CalendarHeatmap
            startDate={meta.start_date}
            endDate={meta.end_date}
            values={activities}
            showWeekdayLabels
            gutterSize={1}
            classForValue={(value: ReactCalendarHeatmapValue | null) => {
              if (!value) {
                return 'color-empty';
              }

              return getColorScale(value.count ?? 0);
            }}
            transformDayElement={(
              element: React.ReactElement<Record<string, unknown>>,
              value: ReactCalendarHeatmapValue | null,
            ) => {
              const elementProps = {
                ...element.props,
                onMouseEnter: (event: React.SyntheticEvent<HTMLElement>) =>
                  showTooltip(event, value),
                onMouseLeave: hideTooltip,
                onFocus: (event: React.SyntheticEvent<HTMLElement>) => showTooltip(event, value),
                onBlur: hideTooltip,
              };

              return cloneElement(element, elementProps);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Heatmap;
