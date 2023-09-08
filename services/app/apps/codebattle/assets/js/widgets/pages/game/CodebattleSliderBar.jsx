import React from 'react';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import { replayerMachineStates } from '../../machines/game';

const handleClassnames = 'cb-slider-handle position-absolute rounded-circle';
const buttonClassnames = 'cb-slider-handle-button position-absolute rounded-circle bg-danger';
const sliderBarClassnames = 'cb-slider-bar position-absolute rounded';

function SliderBar({ className, value }) {
  return (
    <div
      className={className}
      style={{
        width: `${value * 100}%`,
      }}
    />
  );
}

function SliderAction({ className, event, setGameState, value }) {
  return (
    <div>
      <OverlayTrigger
        overlay={<Tooltip id="tooltip-top">{`Check started by ${event.userName}`}</Tooltip>}
        placement="top"
      >
        <div
          aria-hidden="true"
          className={className}
          role="button"
          style={{
            left: `${value * 100}%`,
          }}
          onClick={() => {
            setGameState(value);
          }}
        />
      </OverlayTrigger>
    </div>
  );
}

function SliderHandle({ className, value }) {
  return (
    <div
      className={className}
      style={{
        left: `${value * 100}%`,
      }}
    >
      <div className={buttonClassnames} />
    </div>
  );
}

function CodebattleSliderBar({
  handlerPosition,
  lastIntent,
  mainEvents,
  recordsCount,
  roomCurrent,
  setGameState,
}) {
  return (
    <>
      <div className="cb-slider-timeline position-absolute rounded w-100 x-bg-gray">
        {roomCurrent.matches({ replayer: replayerMachineStates.holded }) && (
          <SliderBar className={`${sliderBarClassnames} x-intent-background`} value={lastIntent} />
        )}
        <SliderBar className={`${sliderBarClassnames} bg-danger`} value={handlerPosition} />
      </div>
      {mainEvents.map((event) => (
        <SliderAction
          key={event.recordId}
          className="cb-slider-action position-absolute bg-warning rounded"
          event={event}
          setGameState={setGameState}
          value={event.recordId / recordsCount}
        />
      ))}
      <SliderHandle className={handleClassnames} value={handlerPosition} />
    </>
  );
}

export default CodebattleSliderBar;
