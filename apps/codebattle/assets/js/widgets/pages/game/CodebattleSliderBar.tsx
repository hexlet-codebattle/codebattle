import React from 'react';

import cn from 'classnames';
import { Tooltip } from '@mantine/core';

import { formatDuration } from './ControlPanel';

const handleClassnames = 'cb-slider-handle position-absolute rounded-circle';
const buttonClassnames = 'cb-slider-handle-button position-absolute rounded-circle bg-danger';
const sliderBarClassnames = 'cb-slider-bar position-absolute cb-rounded';

interface MainEvent {
  recordId: number;
  time?: number;
  userName?: string;
  [key: string]: unknown;
}

interface SliderBarProps {
  value: number;
  className?: string;
}

interface SliderActionProps {
  value: number;
  className?: string;
  event: MainEvent;
  setGameState: (value: number) => void;
  startTime: number | null;
}

interface SliderHandleProps {
  value: number;
  className?: string;
}

interface CodebattleSliderBarProps {
  holded: boolean;
  mainEvents: MainEvent[];
  lastIntent: number;
  handlerPosition: number;
  recordsCount: number;
  setGameState: (value: number) => void;
  startTime: number | null;
}

function SliderBar({ value, className }: SliderBarProps) {
  return (
    <div
      className={className}
      style={{
        width: `${value * 100}%`,
      }}
    />
  );
}

function SliderAction({ value, className, event, setGameState, startTime }: SliderActionProps) {
  const hasDuration = typeof event.time === 'number' && typeof startTime === 'number';
  const durationLabel = hasDuration
    ? formatDuration((event.time as number) - (startTime as number))
    : null;

  return (
    <div>
      <Tooltip
        position="top"
        withArrow
        label={`Check started by ${event.userName}${durationLabel ? ` · ${durationLabel}` : ''}`}
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
      </Tooltip>
    </div>
  );
}

function SliderHandle({ value, className }: SliderHandleProps) {
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
  startTime,
}: CodebattleSliderBarProps) {
  return (
    <>
      <div className="cb-slider-timeline position-absolute cb-rounded w-100 cb-bg-panel">
        <SliderBar
          className={cn(sliderBarClassnames, {
            'x-intent-background': holded,
            'bg-danger': !holded,
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
          startTime={startTime}
        />
      ))}
      <SliderHandle className={handleClassnames} value={handlerPosition} />
    </>
  );
}

export default CodebattleSliderBar;
