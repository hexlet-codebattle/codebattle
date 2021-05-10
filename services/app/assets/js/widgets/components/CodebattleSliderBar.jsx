import React from 'react';
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

const SliderAction = ({ value, className }) => (
  <div
    className={className}
    style={{
      left: `${value * 100}%`,
    }}
  />
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

const CodebattleSliderBar = ({ gameCurrent, handlerPosition, lastIntent }) => (
  <>
    <SliderAction
      value={0.5}
      className="cb-slider-action position-absolute bg-info"
    />
    <div className="cb-slider-timeline position-absolute rounded w-100 x-bg-gray">
      {
        gameCurrent.matches({ replayer: replayerMachineStates.holded })
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
      <SliderHandle
        className={handleClassnames}
        value={handlerPosition}
      />
    </div>
  </>
);

export default CodebattleSliderBar;
