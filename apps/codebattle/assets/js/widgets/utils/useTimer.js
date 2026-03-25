import { useState, useEffect } from "react";

import moment from "moment";

function useTimer(time) {
  const [duration, setDuration] = useState("00:00:00");
  const [seconds, setSeconds] = useState(0);

  const updateTimer = () => {
    const targetTime = moment.isMoment(time)
      ? time.clone()
      : moment.utc(time, moment.ISO_8601, true);

    if (!targetTime.isValid()) {
      setDuration("00:00:00");
      setSeconds(0);
      return;
    }

    const diffMs = Math.max(targetTime.local().diff(moment()), 0);
    const diff = moment.utc(diffMs);

    setDuration(diff.format("HH:mm:ss"));
    setSeconds(moment.duration(diffMs).asSeconds());
  };

  useEffect(() => {
    updateTimer();
    const interval = setInterval(updateTimer, 77);
    return () => clearInterval(interval);
  }, [time]);

  return [duration, seconds];
}

export default useTimer;
