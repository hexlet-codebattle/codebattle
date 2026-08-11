import React from 'react';

import cn from 'classnames';
import { Tooltip } from '@mantine/core';

import { formatDuration } from './ControlPanel';

const handleStyle = {
  position: 'absolute',
  borderRadius: '50%',
} as const;

const buttonStyle = {
  position: 'absolute',
  borderRadius: '50%',
  background: '#dc3545',
} as const;

const sliderBarClassnames = 'cb-slider-bar cb-rounded';

interface MainEvent {
  recordId: number;
  time?: number;
  userName?: string;
  [key: string]: unknown;
}

interface SliderBarProps {
  value: number;
  className?: string;
  style?: React.CSSProperties;
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
            position: 'absolute',
            left: `${value * 100}%`,
            background: '#ffc107',
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
        position: 'absolute',
        borderRadius: '50%',
        left: `${value * 100}%`,
      }}
    >
      <div className="cb-slider-handle-button" style={buttonStyle} />
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
      <div
        className="cb-slider-timeline cb-rounded cb-bg-panel"
        style={{ position: 'absolute', width: '100%' }}
      >
        <SliderBar
          className={cn(sliderBarClassnames, {
            'x-intent-background': holded,
          })}
          style={{
            position: 'absolute',
            background: !holded ? '#dc3545' : undefined,
          }}
          value={holded ? lastIntent : handlerPosition}
        />
      </div>
      {mainEvents.map((event) => (
        <SliderAction
          value={event.recordId / recordsCount}
          className="cb-slider-action cb-rounded"
          key={event.recordId}
          event={event}
          setGameState={setGameState}
          startTime={startTime}
        />
      ))}
      <SliderHandle className="cb-slider-handle" value={handlerPosition} />
    </>
  );
}

export default CodebattleSliderBar;
