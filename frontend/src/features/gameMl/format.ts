import type { RiskLevel } from './types';

export const RISK: Record<RiskLevel, { label: string; color: string }> = {
  none: { label: 'Looks human', color: 'green' },
  low: { label: 'Low risk', color: 'blue' },
  medium: { label: 'Suspicious', color: 'orange' },
  high: { label: 'Likely bot', color: 'red' },
};

/** The score at which the risk scorer says "high" (RiskScorer.classify/1). */
export const HIGH_SCORE = 10;

/** Mantine palette colours of the players, left to right (card edges, charts). */
export const PLAYER_COLORS = ['blue', 'pink', 'teal', 'grape'];

export const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const formatNumber = (value: unknown) => (isNum(value) ? value.toLocaleString() : '—');

export const formatMs = (value: unknown) => {
  if (!isNum(value)) return '—';
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
};

export const pair = (...values: unknown[]) => values.map(formatNumber).join(' / ');

// The code box fits the code: 13px font × 1.6 line height, the editor's padding, room for a
// horizontal scrollbar; long solutions scroll inside.
const CODE_LINE_PX = 21;
export const codeHeight = (text: string) => Math.min(Math.max(text.split('\n').length * CODE_LINE_PX + 30, 90), 480);
