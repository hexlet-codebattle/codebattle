import React from 'react';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import { replayerMachineStates } from '../machines/game';

const handleClassnames = 'cb-slider-handle position-absolute rounded-circle';
const buttonClassnames = 'cb-slider-handle-button position-absolute rounded-circle bg-danger';
const sliderBarClassnames = 'cb-slider-bar position-absolute rounded';

const SliderBar = ({ value, className }) => (
  <div
    className={className}
    style={{
      width: `${value * 100}%`,
    }}
  />
);

const SliderAction = ({
 value, className, setGameState, event,
}) => (
  <div>
    <OverlayTrigger
      placement="top"
      overlay={(
        <Tooltip id="tooltip-top">
          {`Check started by ${event.userName}`}
        </Tooltip>
        )}
    >
      <div
        role="button"
        aria-hidden="true"
        onClick={() => {
        setGameState(value);
      }}
        className={className}
        style={{
            left: `${value * 100}%`,
          }}
      />
    </OverlayTrigger>
  </div>
  );

const SliderHandle = ({ value, className }) => (
  <div
    className={className}
    style={{
      left: `${value * 100}%`,
    }}
  >
    <div className={buttonClassnames} />
  </div>
);

const CodebattleSliderBar = ({
 roomCurrent, handlerPosition, lastIntent, mainEvents, recordsCount, setGameState,
}) => (
  <>
    <div className="cb-slider-timeline position-absolute rounded w-100 x-bg-gray">
      {
        roomCurrent.matches({ replayer: replayerMachineStates.holded })
          && (
          <SliderBar
            className={`${sliderBarClassnames} x-intent-background`}
            value={lastIntent}
          />
)
      }
      <SliderBar
        className={`${sliderBarClassnames} bg-danger`}
        value={handlerPosition}
      />
    </div>
    {mainEvents.map(event => (
      <SliderAction
        value={event.recordId / recordsCount}
        className="cb-slider-action position-absolute bg-warning rounded"
        key={event.recordId}
        event={event}
        setGameState={setGameState}
      />
    ))}
    <SliderHandle
      className={handleClassnames}
      value={handlerPosition}
    />
  </>
);

export default CodebattleSliderBar;
