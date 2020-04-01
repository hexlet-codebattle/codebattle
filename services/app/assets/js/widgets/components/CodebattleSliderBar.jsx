import React from 'react';

const sliderHandleClassnames = 'cb-slider-handle position-absolute rounded-circle';
const sliderButtonClassnames = 'cb-slider-handle-button position-absolute rounded-circle bg-danger';

const CodebattleSliderBar = ({ value: currentValue, lastIntent, isHold }) => {
  const renderSliderBar = ({ value, className }) => (
    <div
      className={className}
      style={{
        width: `${value * 100}%`,
      }}
    />
  );

  const renderSliderAction = ({ value, className }) => (
    <div
      className={className}
      style={{
        left: `${value * 100}%`,
      }}
    />
  );

  const renderSliderHandle = ({ value, className, classNameButton }) => (
    <div
      className={className}
      style={{
        left: `${value * 100}%`,
      }}
    >
      <div className={classNameButton} />
    </div>
  );

  return (
    <>
      {renderSliderAction({ value: 0.5, className: 'cb-slider-action position-absolute bg-info' })}
      <div className="cb-slider-timeline position-absolute rounded w-100 bg-gray">
        {!isHold && renderSliderBar({ value: lastIntent, className: 'cb-slider-bar  position-absolute rounded x-intent-background' })}
        {renderSliderBar({ value: currentValue, className: 'cb-slider-bar position-absolute rounded bg-danger' })}
        {renderSliderHandle({ value: currentValue, className: sliderHandleClassnames, classNameButton: sliderButtonClassnames })}
      </div>
    </>
  );
};


export default CodebattleSliderBar;
