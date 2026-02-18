import React from "react";

import cn from "classnames";
import Tooltip from "react-bootstrap/Tooltip";

import OverlayTrigger from "@/components/OverlayTriggerCompat";

const handleClassnames = "cb-slider-handle position-absolute rounded-circle";
const buttonClassnames = "cb-slider-handle-button position-absolute rounded-circle bg-danger";
const sliderBarClassnames = "cb-slider-bar position-absolute cb-rounded";

function SliderBar({ value, className }) {
  return (
    <div
      className={className}
      style={{
        width: `${value * 100}%`,
      }}
    />
  );
}

function SliderAction({ value, className, event, setGameState }) {
  return (
    <div>
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="tooltip-top">{`Check started by ${event.userName}`}</Tooltip>}
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
}

function SliderHandle({ value, className }) {
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
  holded,
  mainEvents,
  lastIntent,
  handlerPosition,
  recordsCount,
  setGameState,
}) {
  return (
    <>
      <div className="cb-slider-timeline position-absolute cb-rounded w-100 cb-bg-panel">
        <SliderBar
          className={cn(sliderBarClassnames, {
            "x-intent-background": holded,
            "bg-danger": !holded,
          })}
          value={holded ? lastIntent : handlerPosition}
        />
      </div>
      {mainEvents.map((event) => (
        <SliderAction
          value={event.recordId / recordsCount}
          className="cb-slider-action position-absolute bg-warning cb-rounded"
          key={event.recordId}
          event={event}
          setGameState={setGameState}
        />
      ))}
      <SliderHandle className={handleClassnames} value={handlerPosition} />
    </>
  );
}

export default CodebattleSliderBar;
