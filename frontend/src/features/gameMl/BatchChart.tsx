import { Text } from '@mantine/core';

import { formatClockDuration } from '@/features/tournament/clock';

import classes from './GameMl.module.css';

export interface ChartPoint {
  /** Window start / end, ms from the game start. */
  start: number;
  end: number;
  value: number;
}

interface BatchChartProps {
  title: string;
  points: ChartPoint[];
  /** The time axis end (shared by a player's charts). */
  maxX: number;
  kind: 'bar' | 'line';
  format?: (value: number) => string;
}

const W = 360;
const H = 140;
const PAD = { left: 40, right: 8, top: 8, bottom: 18 };

const niceMax = (value: number) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= value) ?? 10;
  return step * magnitude;
};

/**
 * One per-batch series over game time: bars span their telemetry window (zero baseline,
 * negatives below it), a line joins window midpoints. Hover a mark for its value.
 */
export function BatchChart({ title, points, maxX, kind, format = (value) => String(Math.round(value)) }: BatchChartProps) {
  const values = points.map((point) => point.value);
  const yMax = niceMax(Math.max(0, ...values));
  const rawMin = Math.min(0, ...values);
  const yMin = rawMin < 0 ? -niceMax(-rawMin) : 0;
  const spanX = Math.max(maxX, 1);

  const x = (ms: number) => PAD.left + (ms / spanX) * (W - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + ((yMax - value) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
  const yTicks = yMin < 0 ? [yMin, 0, yMax] : [0, yMax / 2, yMax];
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const tip = (point: ChartPoint) => `${formatClockDuration(point.start)}–${formatClockDuration(point.end)}: ${format(point.value)}`;

  // Line: windows without a value (e.g. no key timing samples) break the line.
  const linePoints = points.filter((point) => point.value > 0);
  const path = linePoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x((point.start + point.end) / 2).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <Text size="xs" c="dimmed" fw={600} mb={2}>
        {title}
      </Text>
      <svg viewBox={`0 0 ${W} ${H}`} className={classes.chart} role="img" aria-label={title}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className={tick === 0 ? classes.baseline : classes.grid} />
            <text x={PAD.left - 4} y={y(tick) + 3} textAnchor="end" className={classes.axisLabel}>
              {format(tick)}
            </text>
          </g>
        ))}
        {xTicks.map((share) => (
          <text
            key={share}
            x={x(spanX * share)}
            y={H - 4}
            textAnchor={share === 0 ? 'start' : share === 1 ? 'end' : 'middle'}
            className={classes.axisLabel}
          >
            {formatClockDuration(spanX * share)}
          </text>
        ))}

        {kind === 'bar' &&
          points.map((point) => {
            const mid = x((point.start + point.end) / 2);
            const width = Math.min(16, Math.max(3, x(point.end) - x(point.start) - 2));
            const top = y(Math.max(point.value, 0));
            const height = Math.max(Math.abs(y(point.value) - y(0)), point.value === 0 ? 0 : 1);
            return (
              <g key={`${point.start}-${point.end}`}>
                <rect x={mid - Math.max(width, 10) / 2} y={PAD.top} width={Math.max(width, 10)} height={H - PAD.top - PAD.bottom} className={classes.hit}>
                  <title>{tip(point)}</title>
                </rect>
                <rect x={mid - width / 2} y={top} width={width} height={height} rx={2} className={classes.bar} data-negative={point.value < 0 || undefined} pointerEvents="none" />
              </g>
            );
          })}

        {kind === 'line' && (
          <>
            {path && <path d={path} className={classes.line} />}
            {linePoints.map((point) => (
              <circle key={`${point.start}-${point.end}`} cx={x((point.start + point.end) / 2)} cy={y(point.value)} r={3.5} className={classes.dot}>
                <title>{tip(point)}</title>
              </circle>
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
