import React, { useState, useEffect, useCallback } from "react";

import dayjs from "../../i18n/dayjs";

function ScheduleNavigationTab({ className, events, event, setEvent }) {
  const [prev, setPrevEvent] = useState();
  const [next, setNextEvent] = useState();

  useEffect(() => {
    if (event) {
      const sortedEvents = events.sort((a, b) => dayjs(a.start).diff(dayjs(b.start)));
      const eventIndex = sortedEvents.findIndex((e) => e.resourse.id === event.resourse.id);

      if (eventIndex === -1) return;

      if (eventIndex < 1) {
        setPrevEvent(undefined);
      } else {
        setPrevEvent(sortedEvents[eventIndex - 1]);
      }

      if (eventIndex > events.length - 2) {
        setNextEvent(undefined);
      } else {
        setNextEvent(sortedEvents[eventIndex + 1]);
      }
    }
  }, [event, events, setPrevEvent, setNextEvent]);

  const onClickPrev = useCallback(() => {
    setEvent(prev);
  }, [setEvent, prev]);
  const onClickNext = useCallback(() => {
    setEvent(next);
  }, [setEvent, next]);

  return (
    <div className={className}>
      <div className="d-flex">
        {prev && (
          <div
            role="button"
            onClick={onClickPrev}
            onKeyPress={() => {}}
            className="btn-link"
            tabIndex="0"
          >
            <span className="pr-2">{"<<"}</span>
            {prev.title}
          </div>
        )}
      </div>
      <div className="d-flex">
        {next && (
          <div
            role="button"
            onClick={onClickNext}
            onKeyPress={() => {}}
            className="btn-link"
            tabIndex="0"
          >
            {next.title}
            <span className="pl-2">{">>"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScheduleNavigationTab;
