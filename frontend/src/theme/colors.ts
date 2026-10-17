import type { MantineColorsTuple } from '@mantine/core';

// Palettes derived from the legacy SCSS (assets/css/style.scss). Shade 6 is the
// value the old UI used directly; the rest are interpolated around it.

// Mantine's dark scheme reads these slots: 0 text, 2 dimmed, 3 placeholder,
// 4 borders, 5 default-hover, 6 surfaces, 7 page background.
export const dark: MantineColorsTuple = [
  '#dddddd', // $cb-text-light-color
  '#b8c0d0',
  '#999999', // $cb-text-color
  '#7c808f', // $cb-secondary-disabled-background
  '#4c4c5a', // $cb-border-color
  '#3a3f50', // $cb-secondary
  '#2a2a35', // $cb-bg-panel
  '#1c1c1c', // body (bootstrap $dark override)
  '#171720', // panel gradient end
  '#121218',
];

// $cb-secondary family: the default button colour across the app.
export const slate: MantineColorsTuple = [
  '#eef0f6',
  '#d5d9e6',
  '#c0c4d2', // disabled text
  '#a4b2d6', // focus border
  '#7d89a6', // hover border
  '#4c5369', // hover background
  '#3a3f50', // base
  '#2c303d', // active
  '#22252f',
  '#1c1e27',
];

// $cb-success / $cb-hovered-success.
export const green: MantineColorsTuple = [
  '#e8f6ef',
  '#cdeadc',
  '#a3d8bf',
  '#77c4a0',
  '#58b287',
  '#4da97d',
  '#46a077',
  '#398862',
  '#2e6f50',
  '#22553d',
];

// The logo's red (assets/logo.svg) as shade 6: guest calls to action (Sign up, Play your first battle).
export const brand: MantineColorsTuple = [
  '#ffe8e8',
  '#ffcfcf',
  '#ff9e9e',
  '#ff6b6b',
  '#ff3b3b',
  '#f01414',
  '#db0000',
  '#b80000',
  '#940000',
  '#700000',
];

// Danger: bootstrap `text-danger` (#dc3545) as shade 6 so Mantine's filled red
// is the legacy danger colour.
export const red: MantineColorsTuple = [
  '#ffeaea',
  '#fdd0d0',
  '#f9a3a3',
  '#f47575',
  '#f04c5c', // .cb-text-danger
  '#e8404f',
  '#dc3545', // bootstrap danger
  '#c82333', // bootstrap danger hover
  '#a51d2a',
  '#861010', // Mantine derives the dark alert surface from shade 9
];

// #ff621e highlights.
export const orange: MantineColorsTuple = [
  '#fff0e8',
  '#ffdccb',
  '#ffb896',
  '#ff935f',
  '#ff7a3e',
  '#ff6c2a',
  '#ff621e',
  '#e5520f',
  '#bf430b',
  '#963407',
];

// #73ccfe / #34b4fe info accents.
export const blue: MantineColorsTuple = [
  '#e6f6ff',
  '#cdebff',
  '#a3dcff',
  '#73ccfe',
  '#52c0fe',
  '#41b9fe',
  '#34b4fe',
  '#1a9de6',
  '#0f7fbd',
  '#086394',
];

// #8c64ff / #8566ff.
export const violet: MantineColorsTuple = [
  '#f1ecff',
  '#ddd3ff',
  '#c4b4ff',
  '#b6a4ff',
  '#9f84ff',
  '#9473ff',
  '#8c64ff',
  '#7448ef',
  '#5c34cc',
  '#4726a3',
];

// #ffe500 / #faff0f.
export const yellow: MantineColorsTuple = [
  '#fffde0',
  '#fff9b8',
  '#fff38a',
  '#ffee5c',
  '#ffea33',
  '#ffe71a',
  '#ffe500',
  '#e0c900',
  '#b8a500',
  '#8f8000',
];

// Light values are darkened so outline badges keep contrast on white.
export const grades = {
  grand_slam: { dark: '#e0bf7a', light: '#a8802f' },
  masters: { dark: '#c2c9d6', light: '#6b7686' },
  elite: { dark: '#c48a57', light: '#9a6233' },
  pro: { dark: '#a4aab3', light: '#737a85' },
  challenger: { dark: '#8a919c', light: '#5d646f' },
  rookie: { dark: '#6f7782', light: '#4b525c' },
} as const;

export type Grade = keyof typeof grades;
