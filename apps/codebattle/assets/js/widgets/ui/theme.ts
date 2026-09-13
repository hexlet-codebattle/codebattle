import {
  Button,
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from '@mantine/core';

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

// Panel background (`$cb-bg-panel` #2a2a35 — normal surfaces).
const cbPanel: MantineColorsTuple = [
  '#f2f2f4',
  '#e2e2e6',
  '#c3c3cc',
  '#a0a0ae',
  '#7e7e90',
  '#5c5c72',
  '#2a2a35',
  '#25252f',
  '#202029',
  '#1a1a22',
];

// Highlighted panel background (`$cb-bg-highlight-panel` #1c1c24 — darker,
// used for headers/toolbars/dropdowns on top of `cbPanel`).
const cbHighlight: MantineColorsTuple = [
  '#f2f2f4',
  '#e1e1e6',
  '#c0c0cb',
  '#9b9bad',
  '#78788e',
  '#55556c',
  '#1c1c24',
  '#18181f',
  '#14141a',
  '#0f0f15',
];

// Secondary text (`$cb-text-color` #999 — muted copy on panels).
const cbText: MantineColorsTuple = [
  '#f5f5f5',
  '#eaeaea',
  '#d4d4d4',
  '#bfbfbf',
  '#aaaaaa',
  '#a2a2a2',
  '#999999',
  '#8c8c8c',
  '#808080',
  '#737373',
];

// Light secondary text (`$cb-text-light-color` #ddd — captions/hints).
const cbTextLight: MantineColorsTuple = [
  '#fdfdfd',
  '#fafafa',
  '#f3f3f3',
  '#ececec',
  '#e5e5e5',
  '#e1e1e1',
  '#dddddd',
  '#c9c9c9',
  '#b6b6b6',
  '#a3a3a3',
];

// Gold accent (`$gold` #c9a56c — seasons/hall-of-fame headings, `.text-gold`,
// and the outline-gold buttons).
const gold: MantineColorsTuple = [
  '#fbf6ec',
  '#f5ead2',
  '#ecd3a2',
  '#e4ba6e',
  '#dda441',
  '#d9962a',
  '#c9a56c',
  '#b98438',
  '#a5712e',
  '#8f5c25',
];

// Danger text (`$cb-text-danger` #f04c5c — negative stats/ranks).
const cbDanger: MantineColorsTuple = [
  '#fef0f1',
  '#fbdadd',
  '#f5b3ba',
  '#ee8994',
  '#e96672',
  '#e64e5c',
  '#f04c5c',
  '#d13b4b',
  '#b52e3e',
  '#97202e',
];

// Spacing scale mirrors Bootstrap 4 spacers (0.25 / 0.5 / 1 / 1.5 / 3 rem) so
// converting `mb-2 p-3 …` to Mantine style props (`mb="sm" p="md"`) keeps the
// same visual rhythm during the incremental migration.
export const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand,
    cbSecondary,
    cbSuccess,
    cbPanel,
    cbHighlight,
    cbText,
    cbTextLight,
    gold,
    cbDanger,
  },
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
  components: {
    // Port of `.cb-btn-secondary`: `color="cbSecondary"` already fills index 6
    // (#3a3f50), but Mantine darkens on hover while the app's design *lightens*
    // to `$cb-secondary-hover-background`. Restore that so buttons no longer
    // need the Bootstrap class. cbSuccess needs no override — its tuple index 7
    // already equals `$cb-hovered-success`.
    Button: Button.extend({
      vars: (_theme, props) =>
        props.color === 'cbSecondary' ? { root: { '--button-hover': '#4c5369' } } : { root: {} },
    }),
  },
});

// Align Mantine's default border (used by `withBorder`, inputs, dividers, …)
// with the app's `$cb-border-color`, so idiomatic `<Paper withBorder>` matches
// the legacy `.cb-border-color` panels during the migration. `cb-rounded`
// (= `$cb-border-radius` 0.5rem) maps to Mantine `radius="md"`.
// `--cb-bg-panel-background` is the legacy `.cb-bg-panel` gradient (plain
// `bg="cbPanel"` is flat; sites that used the bare `.cb-bg-panel` class get the
// gradient via this var).
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--cb-bg-panel-background': 'linear-gradient(135deg, #2a2a35 0%, #171720 100%)',
  },
  light: {},
  dark: {
    '--mantine-color-default-border': '#4c4c5a',
  },
});
