import type { CSSVariablesResolver } from '@mantine/core';

import { grades } from './colors';

// Palettes badges can be tinted with (theme colours + Mantine's gray).
export const BADGE_COLORS = ['dark', 'slate', 'gray', 'green', 'red', 'orange', 'blue', 'violet', 'yellow'] as const;

/**
 * "light" badges: Mantine's dark-scheme tint is shade 9 darkened by half — fine
 * for alerts, but small pills turn near-black. In dark, use a translucent tint
 * with a bright text shade instead; light keeps Mantine's pastel tints.
 */
const badgeVariables = (scheme: 'dark' | 'light') =>
  Object.fromEntries(
    BADGE_COLORS.flatMap((color) =>
      scheme === 'dark'
        ? [
            [`--cb-badge-${color}-bg`, `color-mix(in srgb, var(--mantine-color-${color}-5) 20%, transparent)`],
            [`--cb-badge-${color}-color`, `var(--mantine-color-${color}-2)`],
          ]
        : [
            [`--cb-badge-${color}-bg`, `var(--mantine-color-${color}-light)`],
            [`--cb-badge-${color}-color`, `var(--mantine-color-${color}-light-color)`],
          ],
    ),
  );

const gradeVariables = (scheme: 'dark' | 'light') =>
  Object.fromEntries(Object.entries(grades).map(([grade, color]) => [`--cb-grade-${grade}`, color[scheme]]));

// Success / danger come from the legacy chat: `.cb-text-success` (#46a077) and
// bootstrap `text-danger` (#dc3545). Both are shade 6 of their palette, so they
// match Mantine's `filled` green/red (buttons, badges, progress, sliders).
const statusVariables = {
  '--cb-success': 'var(--mantine-color-green-filled)',
  '--cb-success-hover': 'var(--mantine-color-green-filled-hover)',
  '--cb-danger': 'var(--mantine-color-red-filled)',
  '--cb-danger-hover': 'var(--mantine-color-red-filled-hover)',
};

// App-level tokens that have no Mantine equivalent. Components and CSS modules
// read only var(--cb-*) / var(--mantine-*), never hex values, so both schemes
// stay in sync by editing this file alone.
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    ...statusVariables,
    '--cb-radius': '0.5rem',
    '--cb-font-display': "'CB Display', 'Source Code Pro', monospace",
  },
  light: {
    ...gradeVariables('light'),
    ...badgeVariables('light'),
    // Leaderboard 1st/2nd/3rd: deep enough for white digits on a light page.
    '--cb-medal-1': '#8a6a24',
    '--cb-medal-2': '#5b6574',
    '--cb-medal-3': '#85532b',
    '--cb-medal-text': '#ffffff',
    '--cb-panel': '#ffffff',
    '--cb-panel-gradient': 'linear-gradient(135deg, #ffffff 0%, #f4f5f9 100%)',
    '--cb-sunken': '#f2f3f8',
    '--cb-slate-tint': 'var(--mantine-color-slate-1)',
    '--cb-slate-tint-hover': 'var(--mantine-color-slate-2)',
    '--cb-slate-tint-text': 'var(--mantine-color-slate-8)',
    // Behind transparent avatars: dark enough for the white default logo.
    '--cb-avatar-bg': 'var(--mantine-color-slate-6)',
    // Monochrome language logos before user names.
    '--cb-lang-icon': 'var(--mantine-color-slate-5)',
    '--cb-border': '#d5d9e3',
    '--cb-text': 'var(--mantine-color-dark-7)',
    '--cb-text-muted': '#5f6475',
    '--cb-text-strong': '#14141a',
    '--cb-tab': '#eceef4',
    '--cb-tab-hover': '#dfe2eb',
    '--cb-tab-active': 'var(--cb-panel)',
    '--cb-tab-active-text': 'var(--cb-text-strong)',
    '--cb-hover': 'rgba(20, 20, 40, 0.04)',
    '--cb-stripe': 'rgba(20, 20, 40, 0.02)',
    '--cb-shadow-panel': '0 6px 16px rgba(20, 20, 40, 0.08)',
    '--cb-editor': '#fffffe',
    '--cb-selection': 'rgba(58, 63, 80, 0.18)',

    '--mantine-color-body': '#f7f8fb',
    '--mantine-color-text': 'var(--cb-text)',
    '--mantine-color-dimmed': 'var(--cb-text-muted)',
    '--mantine-color-anchor': 'var(--mantine-color-slate-7)',
    '--mantine-color-error': 'var(--cb-danger)',
    '--mantine-color-success': 'var(--cb-success)',
    '--mantine-color-default-border': 'var(--cb-border)',
  },
  dark: {
    ...gradeVariables('dark'),
    ...badgeVariables('dark'),
    '--cb-medal-1': 'var(--cb-grade-grand_slam)',
    '--cb-medal-2': 'var(--cb-grade-masters)',
    '--cb-medal-3': 'var(--cb-grade-elite)',
    '--cb-medal-text': 'var(--mantine-color-dark-8)',
    '--cb-panel': 'var(--mantine-color-dark-6)',
    '--cb-panel-gradient': 'linear-gradient(135deg, #2a2a35 0%, #171720 100%)',
    '--cb-sunken': '#1c1c24',
    '--cb-avatar-bg': 'var(--cb-sunken)',
    '--cb-lang-icon': '#c2c9d6',
    '--cb-slate-tint': 'rgba(164, 178, 214, 0.14)',
    '--cb-slate-tint-hover': 'rgba(164, 178, 214, 0.22)',
    '--cb-slate-tint-text': 'var(--mantine-color-slate-0)',
    '--cb-border': 'var(--mantine-color-dark-4)',
    '--cb-text': 'var(--mantine-color-dark-0)',
    '--cb-text-muted': 'var(--mantine-color-dark-2)',
    '--cb-text-strong': '#ffffff',
    '--cb-tab': '#21242e',
    '--cb-tab-hover': 'var(--mantine-color-slate-5)',
    '--cb-tab-active': 'var(--mantine-color-slate-5)',
    '--cb-tab-active-text': 'var(--mantine-color-white)',
    '--cb-hover': 'rgba(255, 255, 255, 0.04)',
    '--cb-stripe': 'rgba(255, 255, 255, 0.02)',
    '--cb-shadow-panel': '0 8px 18px rgba(0, 0, 0, 0.25)',
    '--cb-editor': '#1e1e1e',
    '--cb-selection': 'rgba(164, 178, 214, 0.3)',

    // Mantine defaults pick shades too dark/blue for this palette.
    '--mantine-color-anchor': 'var(--mantine-color-white)',
    '--mantine-color-error': 'var(--cb-danger)',
    '--mantine-color-success': 'var(--cb-success)',
    '--mantine-color-default': 'var(--mantine-color-slate-6)',
    '--mantine-color-default-hover': 'var(--mantine-color-slate-5)',
    '--mantine-color-default-border': 'var(--mantine-color-dark-4)',
  },
});
