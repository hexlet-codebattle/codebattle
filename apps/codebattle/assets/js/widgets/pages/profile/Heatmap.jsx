import React, { cloneElement, useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";
import dayjs from "dayjs";
import CalendarHeatmap from "react-calendar-heatmap";
import { useDispatch } from "react-redux";

import Loading from "../../components/Loading";
import { actions } from "../../slices";

const firstSupportedYear = 2017;
const latestValue = "latest";

const getColorScale = (count) => {
  if (count >= 5) {
    return "color-huge";
  }
  if (count >= 3) {
    return "color-large";
  }
  if (count >= 1) {
    return "color-small";
  }
  return "color-empty";
};

function Heatmap() {
  const dispatch = useDispatch();
  const userId = useMemo(() => window.location.pathname.split("/").pop(), []);
  const currentYear = dayjs().year();
  const gridWrapperRef = useRef(null);
  const [selectedPeriod, setSelectedPeriod] = useState(latestValue);
  const [activityData, setActivityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

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

    axios
      .get(`/api/v1/${userId}/activity`, {
        params: selectedPeriod === latestValue ? {} : { year: Number(selectedPeriod) },
      })
      .then((response) => {
        setActivityData(response.data);
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
    ? `${totalGames} games in ${meta.year}`
    : `${totalGames} games in the last 365 days`;
  const range = `${dayjs(meta.start_date).format("MMM D, YYYY")} - ${dayjs(meta.end_date).format("MMM D, YYYY")}`;

  const showTooltip = (event, value) => {
    const wrapperRect = gridWrapperRef.current?.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();

    if (!wrapperRect) {
      return;
    }

    setTooltip({
      text: value ? `${value.count} games on ${value.date}` : "No games",
      x: targetRect.left - wrapperRect.left + targetRect.width / 2,
      y: targetRect.top - wrapperRect.top - 8,
    });
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <div className="cb-profile-heatmap">
      <div className="d-flex flex-column flex-lg-row align-items-center justify-content-between mb-3">
        <div className="d-none d-lg-block" style={{ width: "176px" }} aria-hidden="true" />
        <div className="mb-3 mb-lg-0 cb-profile-heatmap-heading flex-grow-1">
          <div className="cb-profile-heatmap-title">
            <span>{title}</span>
            <span className="cb-profile-heatmap-separator">•</span>
            <span className="cb-profile-heatmap-range">{range}</span>
          </div>
        </div>
        <div className="cb-profile-heatmap-controls d-flex justify-content-center justify-content-lg-end">
          <select
            id="heatmap-year-select"
            className="custom-select cb-bg-panel cb-border-color text-white cb-profile-heatmap-select"
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(event.target.value)}
            disabled={isLoading}
          >
            <option value={latestValue}>Last 365 days</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

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
            classForValue={(value) => {
              if (!value) {
                return "color-empty";
              }

              return getColorScale(value.count);
            }}
            transformDayElement={(element, value) => {
              const elementProps = {
                ...element.props,
                onMouseEnter: (event) => showTooltip(event, value),
                onMouseLeave: hideTooltip,
                onFocus: (event) => showTooltip(event, value),
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
