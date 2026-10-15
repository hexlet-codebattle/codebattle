import type { editor } from 'monaco-editor';

import { blue, dark, green, orange, red, slate, violet, yellow } from '@/theme/colors';

// The Codebattle editor themes: Mantine's palettes (theme/colors.ts) mapped onto Monaco
// tokens and the whole editor chrome, so the editor reads as part of the design system.
// Monarch grammars mostly emit keyword / identifier / type / string / number / comment /
// delimiter / regexp / predefined / annotation, so those carry the contrast.

const hex = (color: string) => color.replace('#', '');
/** `#rrggbb` + alpha (0..1) as `#rrggbbaa`. */
const alpha = (color: string, opacity: number) =>
  `${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')}`;

interface Tokens {
  fg: string;
  comment: string;
  docComment: string;
  keyword: string;
  control: string;
  constant: string;
  string: string;
  escape: string;
  number: string;
  regexp: string;
  type: string;
  operator: string;
  delimiter: string;
  bracket: string;
  predefined: string;
  annotation: string;
  tag: string;
  attribute: string;
  variable: string;
  invalid: string;
}

const rules = (c: Tokens): editor.ITokenThemeRule[] =>
  [
    ['', c.fg],
    ['comment', c.comment, 'italic'],
    ['comment.doc', c.docComment, 'italic'],
    ['keyword', c.keyword],
    ['keyword.flow', c.control],
    ['keyword.control', c.control],
    ['keyword.constant', c.constant],
    ['constant', c.constant],
    ['storage', c.keyword],
    ['string', c.string],
    ['string.escape', c.escape, 'bold'],
    ['string.key', c.attribute],
    ['string.key.json', c.attribute],
    ['string.value.json', c.string],
    ['number', c.number],
    ['number.hex', c.number],
    ['number.float', c.number],
    ['regexp', c.regexp],
    ['type', c.type],
    ['type.identifier', c.type],
    ['identifier', c.fg],
    ['variable', c.fg],
    ['variable.predefined', c.variable],
    ['variable.parameter', c.variable],
    ['operator', c.operator],
    ['delimiter', c.delimiter],
    ['delimiter.bracket', c.bracket],
    ['delimiter.parenthesis', c.bracket],
    ['delimiter.square', c.bracket],
    ['delimiter.curly', c.bracket],
    ['predefined', c.predefined],
    ['annotation', c.annotation],
    ['metatag', c.annotation],
    ['tag', c.tag],
    ['attribute.name', c.attribute],
    ['attribute.value', c.string],
    ['invalid', c.invalid, 'underline'],
  ].map(([token, color, fontStyle]) => ({ token, foreground: hex(color), ...(fontStyle ? { fontStyle } : {}) }));

/** Six bracket-pair colours, then the same as guides. */
const bracketColors = (colors: string[]) =>
  Object.fromEntries(
    colors.flatMap((color, index) => [
      [`editorBracketHighlight.foreground${index + 1}`, color],
      [`editorBracketPairGuide.activeBackground${index + 1}`, alpha(color, 0.55)],
      [`editorBracketPairGuide.background${index + 1}`, alpha(color, 0.18)],
    ]),
  );

const DARK_BG = dark[8];
const DARK_PANEL = dark[6];

export const codebattleDark: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: rules({
    fg: dark[0],
    comment: dark[3],
    docComment: slate[3],
    keyword: violet[4],
    control: violet[3],
    constant: orange[3],
    string: green[3],
    escape: green[1],
    number: orange[4],
    regexp: red[3],
    type: yellow[3],
    operator: blue[2],
    delimiter: dark[2],
    bracket: slate[2],
    predefined: blue[3],
    annotation: orange[3],
    tag: violet[4],
    attribute: blue[3],
    variable: orange[2],
    invalid: red[4],
  }),
  colors: {
    'editor.background': DARK_BG,
    'editor.foreground': dark[0],
    'editorCursor.foreground': green[4],
    'editor.lineHighlightBackground': alpha(dark[6], 0.55),
    'editor.lineHighlightBorder': alpha(dark[6], 0),
    'editorLineNumber.foreground': dark[4],
    'editorLineNumber.activeForeground': dark[1],
    'editor.selectionBackground': alpha(slate[5], 0.75),
    'editor.inactiveSelectionBackground': alpha(slate[5], 0.4),
    'editor.selectionHighlightBackground': alpha(slate[6], 0.6),
    'editor.wordHighlightBackground': alpha(slate[6], 0.45),
    'editor.wordHighlightStrongBackground': alpha(violet[6], 0.22),
    'editor.findMatchBackground': alpha(orange[6], 0.4),
    'editor.findMatchHighlightBackground': alpha(orange[6], 0.16),
    'editorBracketMatch.background': alpha(green[6], 0.2),
    'editorBracketMatch.border': alpha(green[6], 0.8),
    'editorIndentGuide.background1': dark[6],
    'editorIndentGuide.activeBackground1': dark[4],
    'editorWhitespace.foreground': alpha(dark[4], 0.8),
    'editorRuler.foreground': dark[6],
    'editorGutter.background': DARK_BG,
    'editorWidget.background': DARK_PANEL,
    'editorWidget.border': dark[4],
    'editorSuggestWidget.background': DARK_PANEL,
    'editorSuggestWidget.border': dark[4],
    'editorSuggestWidget.selectedBackground': slate[6],
    'editorSuggestWidget.highlightForeground': green[3],
    'editorSuggestWidget.focusHighlightForeground': green[2],
    'editorHoverWidget.background': DARK_PANEL,
    'editorHoverWidget.border': dark[4],
    'editorError.foreground': red[4],
    'editorWarning.foreground': yellow[6],
    'editorInfo.foreground': blue[5],
    'editorLink.activeForeground': blue[3],
    'editorOverviewRuler.border': alpha(DARK_BG, 0),
    'scrollbarSlider.background': alpha(dark[4], 0.35),
    'scrollbarSlider.hoverBackground': alpha(dark[4], 0.6),
    'scrollbarSlider.activeBackground': alpha(dark[3], 0.6),
    'editorStickyScroll.background': DARK_PANEL,
    'editorStickyScrollHover.background': slate[7],
    'minimap.background': DARK_BG,
    'input.background': dark[7],
    'input.border': dark[4],
    'focusBorder': alpha(green[6], 0.6),
    ...bracketColors([violet[3], blue[3], green[3], orange[3], yellow[3], red[3]]),
  },
};

export const codebattleLight: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: rules({
    fg: slate[9],
    comment: slate[4],
    docComment: slate[5],
    keyword: violet[7],
    control: violet[8],
    constant: orange[8],
    string: green[8],
    escape: green[9],
    number: orange[7],
    regexp: red[7],
    type: yellow[9],
    operator: blue[8],
    delimiter: slate[5],
    bracket: slate[6],
    predefined: blue[8],
    annotation: orange[8],
    tag: violet[7],
    attribute: blue[8],
    variable: red[8],
    invalid: red[6],
  }),
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': slate[9],
    'editorCursor.foreground': green[7],
    'editor.lineHighlightBackground': '#f4f5f9',
    'editor.lineHighlightBorder': '#f4f5f900',
    'editorLineNumber.foreground': slate[2],
    'editorLineNumber.activeForeground': slate[6],
    'editor.selectionBackground': slate[1],
    'editor.inactiveSelectionBackground': alpha(slate[1], 0.6),
    'editor.selectionHighlightBackground': slate[0],
    'editor.wordHighlightBackground': alpha(slate[2], 0.35),
    'editor.wordHighlightStrongBackground': alpha(violet[3], 0.25),
    'editor.findMatchBackground': alpha(orange[3], 0.55),
    'editor.findMatchHighlightBackground': alpha(orange[2], 0.35),
    'editorBracketMatch.background': green[1],
    'editorBracketMatch.border': green[6],
    'editorIndentGuide.background1': slate[0],
    'editorIndentGuide.activeBackground1': slate[2],
    'editorWhitespace.foreground': slate[1],
    'editorRuler.foreground': slate[0],
    'editorGutter.background': '#ffffff',
    'editorWidget.background': '#ffffff',
    'editorWidget.border': '#d5d9e3',
    'editorSuggestWidget.background': '#ffffff',
    'editorSuggestWidget.border': '#d5d9e3',
    'editorSuggestWidget.selectedBackground': slate[0],
    'editorSuggestWidget.highlightForeground': green[7],
    'editorSuggestWidget.focusHighlightForeground': green[8],
    'editorHoverWidget.background': '#ffffff',
    'editorHoverWidget.border': '#d5d9e3',
    'editorError.foreground': red[6],
    'editorWarning.foreground': yellow[8],
    'editorInfo.foreground': blue[7],
    'editorLink.activeForeground': blue[8],
    'editorOverviewRuler.border': '#ffffff00',
    'scrollbarSlider.background': alpha(slate[3], 0.25),
    'scrollbarSlider.hoverBackground': alpha(slate[3], 0.45),
    'scrollbarSlider.activeBackground': alpha(slate[4], 0.5),
    'editorStickyScroll.background': '#f7f8fb',
    'editorStickyScrollHover.background': slate[0],
    'minimap.background': '#ffffff',
    'input.background': '#ffffff',
    'input.border': '#d5d9e3',
    'focusBorder': alpha(green[6], 0.6),
    ...bracketColors([violet[6], blue[7], green[7], orange[7], yellow[8], red[6]]),
  },
};
