import React, { useContext, memo, useState } from "react";

import cn from "classnames";
import i18next from "i18next";
import moment from "moment";
import { useSelector } from "react-redux";

import CountdownTimer from "../../components/CountdownTimer";
import RoomContext from "../../components/RoomContext";
import Timer from "../../components/Timer";
import GameRoomModes from "../../config/gameModes";
import {
  roomStateSelector,
  inPreviewRoomSelector,
  isGameOverSelector,
  isStoredGameSelector,
} from "../../machines/selectors";
import * as selectors from "../../selectors";
import useMachineStateSelector from "../../utils/useMachineStateSelector";

const gameStatuses = {
  stored: i18next.t("stored"),
  game_over: i18next.t("game_over"),
  timeout: i18next.t("game_over"),
};

const loadingTitle = i18next.t("Loading...");

function formatDuration(durationSec) {
  if (durationSec === null || durationSec === undefined) {
    return null;
  }

  return moment.utc(durationSec * 1000).format("HH:mm:ss");
}

function GameRoomTimer({ timeoutSeconds, time }) {
  if (timeoutSeconds === null) {
    return loadingTitle;
  }

  if (timeoutSeconds && time) {
    return <CountdownTimer time={time} timeoutSeconds={timeoutSeconds} colorized />;
  }

  if (!time) {
    return <></>;
  }

  return <Timer time={time} />;
}

function GameOverTimer({ timeoutSeconds, time, durationSec }) {
  const [remaining] = useState(() => {
    if (!timeoutSeconds) {
      return null;
    }

    if (durationSec !== null && durationSec !== undefined) {
      const remainingSec = Math.max(timeoutSeconds - durationSec, 0);
      return moment.utc(remainingSec * 1000).format("HH:mm:ss");
    }

    if (!time) {
      return null;
    }

    const diff = moment().diff(moment.utc(time));
    const remainingMs = Math.max(timeoutSeconds * 1000 - diff, 0);

    return moment.utc(remainingMs).format("HH:mm:ss");
  });

  if (!remaining) {
    return i18next.t("game_over");
  }

  const [hours, minutes, seconds] = remaining.split(":").map(Number);
  const remainingSeconds = hours * 3600 + minutes * 60 + seconds;
  const progress = timeoutSeconds ? 100 - Math.ceil((remainingSeconds / timeoutSeconds) * 100) : 0;
  const progressBgColor = cn("cb-timer-progress", {
    "bg-secondary": remainingSeconds > 45,
    "bg-warning": remainingSeconds <= 45 && remainingSeconds >= 15,
    "bg-danger": remainingSeconds < 15,
  });

  return (
    <>
      <span className="text-monospace">
        {i18next.t("game_over")}:{remaining}
      </span>
      <div className={progressBgColor} style={{ width: `${progress}%` }} />
    </>
  );
}

function TimerContainer() {
  const { mainService } = useContext(RoomContext);

  const {
    startsAt: time,
    timeoutSeconds,
    durationSec,
    state: gameStateName,
    mode,
  } = useSelector(selectors.gameStatusSelector);

  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);

  const isPreviewRoom = inPreviewRoomSelector(roomMachineState);
  const isGameOver = isGameOverSelector(roomMachineState);
  const isGameStored = isStoredGameSelector(roomMachineState);

  if (isPreviewRoom) {
    return loadingTitle;
  }

  if (mode === GameRoomModes.history) {
    const duration = formatDuration(durationSec);

    if (!duration) {
      return i18next.t("History");
    }

    return <span className="text-monospace">{`${i18next.t("Duration")}: ${duration}`}</span>;
  }

  if (isGameStored) {
    return gameStatuses[gameStateName];
  }

  if (isGameOver) {
    return <GameOverTimer timeoutSeconds={timeoutSeconds} time={time} durationSec={durationSec} />;
  }

  return <GameRoomTimer timeoutSeconds={timeoutSeconds} time={time} />;
}

export default memo(TimerContainer);
