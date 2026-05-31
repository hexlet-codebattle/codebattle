import React from "react";

import cn from "classnames";
import copy from "copy-to-clipboard";
import Gon from "gon";
import { PlayerIcon } from "react-player-controls";
import { useDispatch } from "react-redux";

import speedModes from "../../config/speedModes";
import playbackModes from "../../config/playbackModes";
import { replayerMachineStates } from "../../machines/game";
import { actions } from "../../slices";

const gameId = Gon.getAsset("game_id");

const formatDuration = (ms) => {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "--:--";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};

export { formatDuration };

function ControlPanel({
  roomMachineState,
  onPauseClick,
  onPlayClick,
  onChangeSpeed,
  playbackMode,
  onChangePlaybackMode,
  children,
  nextRecordId,
  currentTime,
  totalDuration,
}) {
  const dispatch = useDispatch();

  const { speedMode } = roomMachineState.context;
  const isPaused = !roomMachineState.matches({ replayer: replayerMachineStates.playing });

  const speedControlClassNames = cn("btn btn-sm cb-rounded ml-2 border cb-border-color", {
    "btn-light": speedMode === speedModes.normal,
    "btn-secondary cb-btn-secondary": speedMode !== speedModes.normal,
  });

  const playbackControlClassNames = cn("btn btn-sm cb-rounded ml-2 border cb-border-color", {
    "btn-light": playbackMode === playbackModes.standard,
    "btn-secondary cb-btn-secondary": playbackMode === playbackModes.realtime,
  });

  const onControlButtonClick = () => {
    switch (true) {
      case roomMachineState.matches({ replayer: replayerMachineStates.ended }):
      case roomMachineState.matches({ replayer: replayerMachineStates.paused }):
        onPlayClick();
        break;
      case roomMachineState.matches({ replayer: replayerMachineStates.playing }):
        onPauseClick();
        break;
      default:
        dispatch(actions.setError(new Error("unexpected game state [players ControlPanel]")));
    }
  };

  return (
    <>
      <button
        type="button"
        className="mr-4 btn btn-secondary cb-btn-secondary cb-rounded text-white"
        onClick={onControlButtonClick}
      >
        {isPaused ? (
          <PlayerIcon.Play width={32} height={32} />
        ) : (
          <PlayerIcon.Pause width={32} height={32} />
        )}
      </button>
      {children}
      {totalDuration !== null && totalDuration !== undefined && (
        <span className="ml-3 mr-1 small text-monospace cb-text-muted" aria-label="Playback time">
          {formatDuration(currentTime)}
          {" / "}
          {formatDuration(totalDuration)}
        </span>
      )}
      <div className="dropup ml-2">
        <button
          className="btn btn-secondary cb-btn-secondary px-2 ml-1 shadow-none d-flex cb-rounded"
          type="button"
          id="dropdownMenuButton"
          data-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="Settings menu"
        >
          <i className="fas fa-cog" />
        </button>
        <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
          <div className="d-flex">
            <button
              type="button"
              className={speedControlClassNames}
              onClick={onChangeSpeed}
              aria-label="Toggle speed"
              title={`Playback speed: ${speedMode}`}
            >
              {speedMode}
            </button>
            {playbackMode && (
              <button
                type="button"
                className={playbackControlClassNames}
                onClick={onChangePlaybackMode}
                title={
                  playbackMode === playbackModes.realtime
                    ? "Standard playback mode"
                    : "Real-time playback mode"
                }
                aria-label="Toggle playback mode"
              >
                {playbackMode === playbackModes.realtime ? "RT" : "ST"}
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm ml-2 border btn-light cb-rounded"
              title="Copy history game url at current record id"
              aria-label="Copy game link"
              onClick={() => {
                const url = `https://codebattle.hexlet.io/games/${gameId}?t=${nextRecordId}`;
                copy(url);
              }}
            >
              <i className="fas fa-link" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ControlPanel;
