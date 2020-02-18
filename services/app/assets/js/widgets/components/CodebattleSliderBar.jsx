import React from 'react';

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
      {renderSliderAction({ value: 0.5, className: 'x-slider-action bg-info' })}
      <div className="x-slider-timeline bg-gray">
        {!isHold && renderSliderBar({ value: lastIntent, className: 'x-slider-bar x-intent-background' })}
        {renderSliderBar({ value: currentValue, className: 'x-slider-bar bg-danger' })}
        {renderSliderHandle({ value: currentValue, className: 'x-slider-handle', classNameButton: 'x-slider-handle-button bg-danger' })}
      </div>
    </>
  );
};


export default CodebattleSliderBar;
