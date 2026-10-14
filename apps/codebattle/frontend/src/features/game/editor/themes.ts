import type { editor } from 'monaco-editor';

import { codebattleDark, codebattleLight } from './codebattleTheme';

// Monaco color themes, defined inline (a few token colors each) so they cost next to
// nothing in the bundle. "auto" (Codebattle), "vs" and "high-contrast" follow the
// site's light/dark; the rest are fixed palettes.

type ThemeData = editor.IStandaloneThemeData;

interface Palette {
  base: 'vs' | 'vs-dark';
  bg: string;
  fg: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  type: string;
  func: string;
  selection: string;
  lineHighlight: string;
  lineNumber: string;
  cursor: string;
}

const build = (p: Palette): ThemeData => ({
  base: p.base,
  inherit: true,
  rules: [
    { token: '', foreground: p.fg },
    { token: 'comment', foreground: p.comment, fontStyle: 'italic' },
    { token: 'keyword', foreground: p.keyword },
    { token: 'keyword.control', foreground: p.keyword },
    { token: 'storage', foreground: p.keyword },
    { token: 'string', foreground: p.string },
    { token: 'string.escape', foreground: p.number },
    { token: 'number', foreground: p.number },
    { token: 'constant', foreground: p.number },
    { token: 'regexp', foreground: p.string },
    { token: 'type', foreground: p.type },
    { token: 'type.identifier', foreground: p.type },
    { token: 'class', foreground: p.type },
    { token: 'function', foreground: p.func },
    { token: 'identifier', foreground: p.fg },
    { token: 'delimiter', foreground: p.fg },
    { token: 'operator', foreground: p.keyword },
    { token: 'variable', foreground: p.fg },
    { token: 'tag', foreground: p.keyword },
    { token: 'attribute.name', foreground: p.func },
  ],
  colors: {
    'editor.background': `#${p.bg}`,
    'editor.foreground': `#${p.fg}`,
    'editor.selectionBackground': `#${p.selection}`,
    'editor.lineHighlightBackground': `#${p.lineHighlight}`,
    'editorLineNumber.foreground': `#${p.lineNumber}`,
    'editorLineNumber.activeForeground': `#${p.fg}`,
    'editorCursor.foreground': `#${p.cursor}`,
    'editorIndentGuide.background1': `#${p.lineHighlight}`,
    'editorWhitespace.foreground': `#${p.lineNumber}80`,
  },
});

const PALETTES: Record<string, Palette> = {
  dracula: {
    base: 'vs-dark',
    bg: '282a36',
    fg: 'f8f8f2',
    comment: '6272a4',
    keyword: 'ff79c6',
    string: 'f1fa8c',
    number: 'bd93f9',
    type: '8be9fd',
    func: '50fa7b',
    selection: '44475a',
    lineHighlight: '343746',
    lineNumber: '6272a4',
    cursor: 'f8f8f0',
  },
  monokai: {
    base: 'vs-dark',
    bg: '272822',
    fg: 'f8f8f2',
    comment: '75715e',
    keyword: 'f92672',
    string: 'e6db74',
    number: 'ae81ff',
    type: '66d9ef',
    func: 'a6e22e',
    selection: '49483e',
    lineHighlight: '3e3d32',
    lineNumber: '90908a',
    cursor: 'f8f8f0',
  },
  nord: {
    base: 'vs-dark',
    bg: '2e3440',
    fg: 'd8dee9',
    comment: '616e88',
    keyword: '81a1c1',
    string: 'a3be8c',
    number: 'b48ead',
    type: '8fbcbb',
    func: '88c0d0',
    selection: '434c5e',
    lineHighlight: '3b4252',
    lineNumber: '4c566a',
    cursor: 'd8dee9',
  },
  'one-dark': {
    base: 'vs-dark',
    bg: '282c34',
    fg: 'abb2bf',
    comment: '5c6370',
    keyword: 'c678dd',
    string: '98c379',
    number: 'd19a66',
    type: 'e5c07b',
    func: '61afef',
    selection: '3e4451',
    lineHighlight: '2c313c',
    lineNumber: '4b5263',
    cursor: '528bff',
  },
  'solarized-dark': {
    base: 'vs-dark',
    bg: '002b36',
    fg: '839496',
    comment: '586e75',
    keyword: '859900',
    string: '2aa198',
    number: 'd33682',
    type: 'b58900',
    func: '268bd2',
    selection: '073642',
    lineHighlight: '073642',
    lineNumber: '586e75',
    cursor: '819090',
  },
  'solarized-light': {
    base: 'vs',
    bg: 'fdf6e3',
    fg: '657b83',
    comment: '93a1a1',
    keyword: '859900',
    string: '2aa198',
    number: 'd33682',
    type: 'b58900',
    func: '268bd2',
    selection: 'eee8d5',
    lineHighlight: 'eee8d5',
    lineNumber: '93a1a1',
    cursor: '657b83',
  },
  'github-dark': {
    base: 'vs-dark',
    bg: '0d1117',
    fg: 'c9d1d9',
    comment: '8b949e',
    keyword: 'ff7b72',
    string: 'a5d6ff',
    number: '79c0ff',
    type: 'ffa657',
    func: 'd2a8ff',
    selection: '264f78',
    lineHighlight: '161b22',
    lineNumber: '484f58',
    cursor: 'c9d1d9',
  },
  'github-light': {
    base: 'vs',
    bg: 'ffffff',
    fg: '24292f',
    comment: '6e7781',
    keyword: 'cf222e',
    string: '0a3069',
    number: '0550ae',
    type: '953800',
    func: '8250df',
    selection: 'b6e3ff',
    lineHighlight: 'f6f8fa',
    lineNumber: '8c959f',
    cursor: '24292f',
  },
};

export const EDITOR_THEMES: { value: string; label: string }[] = [
  { value: 'auto', label: 'Codebattle' },
  { value: 'vs', label: 'Visual Studio' },
  { value: 'high-contrast', label: 'High contrast' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'nord', label: 'Nord' },
  { value: 'one-dark', label: 'One Dark' },
  { value: 'solarized-dark', label: 'Solarized Dark' },
  { value: 'solarized-light', label: 'Solarized Light' },
  { value: 'github-dark', label: 'GitHub Dark' },
  { value: 'github-light', label: 'GitHub Light' },
];

/** Registers the palettes with Monaco (once, from monaco.ts). */
// Broadcast kiosk theme (stream page, `editor_theme=cb-stream`): lavender on a transparent
// background so OBS composites the code over the capture.
const STREAM_THEME: ThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: '949EF4' },
    { token: 'keyword', foreground: 'F472B6', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: 'F472B6', fontStyle: 'bold' },
    { token: 'string', foreground: 'C084FC' },
    { token: 'string.escape', foreground: 'C084FC' },
    { token: 'number', foreground: 'FBBF24' },
    { token: 'comment', foreground: '5B6478', fontStyle: 'italic' },
    { token: 'type', foreground: '60A5FA' },
    { token: 'type.identifier', foreground: '60A5FA' },
    { token: 'identifier', foreground: '949EF4' },
    { token: 'function', foreground: 'FACC15' },
    { token: 'operator', foreground: 'F87171' },
    { token: 'delimiter', foreground: '949EF4' },
    { token: 'delimiter.bracket', foreground: '949EF4' },
    { token: 'constant', foreground: 'FBBF24' },
  ],
  colors: {
    'editor.background': '#00000000',
    'editor.foreground': '#949EF4',
    'editorLineNumber.foreground': '#3F3F5C',
    'editorLineNumber.activeForeground': '#949EF4',
    'editor.lineHighlightBackground': '#00000000',
    'editor.lineHighlightBorder': '#00000000',
    'editorCursor.foreground': '#949EF4',
    'editor.selectionBackground': '#1E1E3F',
    'editor.inactiveSelectionBackground': '#14142A',
    'editorIndentGuide.background1': '#1A1A2E',
    'editorIndentGuide.activeBackground1': '#3F3F5C',
    'editorWhitespace.foreground': '#1A1A2E',
    'scrollbarSlider.background': '#1E1E3F88',
    'scrollbarSlider.hoverBackground': '#1E1E3FAA',
    'scrollbarSlider.activeBackground': '#1E1E3FCC',
  },
};

export function defineThemes(monacoEditor: typeof editor) {
  monacoEditor.defineTheme('cb-stream', STREAM_THEME);
  monacoEditor.defineTheme('cb-codebattle-dark', codebattleDark);
  monacoEditor.defineTheme('cb-codebattle-light', codebattleLight);
  Object.entries(PALETTES).forEach(([name, palette]) => monacoEditor.defineTheme(`cb-${name}`, build(palette)));
}

/** The Monaco theme name for a preference and the site's scheme. */
export function resolveTheme(theme: string, scheme: 'light' | 'dark') {
  if (theme === 'high-contrast') return scheme === 'dark' ? 'hc-black' : 'hc-light';
  if (theme === 'vs') return scheme === 'dark' ? 'vs-dark' : 'vs';
  if (PALETTES[theme]) return `cb-${theme}`;
  return scheme === 'dark' ? 'cb-codebattle-dark' : 'cb-codebattle-light';
}

export interface ThemeSwatch {
  bg: string;
  /** Three token colours (keyword, string, number) drawn as code lines. */
  lines: [string, string, string];
}

const swatchOf = (theme: editor.IStandaloneThemeData, keys: [string, string, string]): ThemeSwatch => {
  const color = (token: string) => `#${theme.rules.find((rule) => rule.token === token)?.foreground ?? '888888'}`;
  return { bg: theme.colors['editor.background'], lines: keys.map(color) as [string, string, string] };
};

/** A small preview of a theme (for the settings swatches), in the site's scheme where it follows it. */
export function themeSwatch(theme: string, scheme: 'light' | 'dark'): ThemeSwatch {
  if (theme === 'vs') {
    return scheme === 'dark'
      ? { bg: '#1e1e1e', lines: ['#569cd6', '#ce9178', '#b5cea8'] }
      : { bg: '#ffffff', lines: ['#0000ff', '#a31515', '#098658'] };
  }
  if (theme === 'high-contrast') {
    return scheme === 'dark'
      ? { bg: '#000000', lines: ['#569cd6', '#ce9178', '#ffffff'] }
      : { bg: '#ffffff', lines: ['#0f4a85', '#264f78', '#000000'] };
  }
  const palette = PALETTES[theme];
  if (palette) return { bg: `#${palette.bg}`, lines: [`#${palette.keyword}`, `#${palette.string}`, `#${palette.number}`] };
  return swatchOf(scheme === 'dark' ? codebattleDark : codebattleLight, ['keyword', 'string', 'number']);
}
