import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Brand accent — the app's `$orange` (rgba(238, 55, 55, 0.76) ≈ #ee3737).
// Mantine needs a 10-shade tuple; index 6 is the default filled shade.
const brand: MantineColorsTuple = [
  '#ffe9e6',
  '#ffd2cc',
  '#ffa39a',
  '#ff7163',
  '#fa4736',
  '#f52d1a',
  '#ee3737',
  '#d31f20',
  '#bd1519',
  '#a60510',
];

// Dark secondary button color (`$cb-secondary` #3a3f50, filled at index 6).
const cbSecondary: MantineColorsTuple = [
  '#f3f4f6',
  '#e4e6ea',
  '#c6cad2',
  '#a6adb9',
  '#8b93a3',
  '#798296',
  '#3a3f50',
  '#333848',
  '#2c3140',
  '#242835',
];

// Success button color (`$cb-success` #46a077, hover `$cb-hovered-success` #398862
// lands on index 7 — matches Mantine's darken-on-hover).
const cbSuccess: MantineColorsTuple = [
  '#e7f6ef',
  '#d2ece1',
  '#a6d9c2',
  '#77c5a1',
  '#52b485',
  '#3caa74',
  '#46a077',
  '#398862',
  '#2f7150',
  '#1f5c3f',
];

// Spacing scale mirrors Bootstrap 4 spacers (0.25 / 0.5 / 1 / 1.5 / 3 rem) so
// converting `mb-2 p-3 …` to Mantine style props (`mb="sm" p="md"`) keeps the
// same visual rhythm during the incremental migration.
export const theme = createTheme({
  primaryColor: 'brand',
  colors: { brand, cbSecondary, cbSuccess },
  fontFamily: 'Montserrat, sans-serif',
  fontFamilyMonospace: "'Source Code Pro', monospace",
  defaultRadius: 'sm',
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '3rem',
  },
});
