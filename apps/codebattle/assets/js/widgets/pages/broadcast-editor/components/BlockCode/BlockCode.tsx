import React, { useState, useEffect } from 'react';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  vscDarkPlus,
  okaidia,
  coy,
  duotoneDark,
  tomorrow,
  atomDark,
  prism,
  solarizedlight,
  gruvboxDark,
  gruvboxLight,
  materialDark,
  materialLight,
  oneDark,
} from 'react-syntax-highlighter/dist/esm/styles/prism';

import BlockBase from '../BlockBase/BlockBase';
import { type BlockCommonProps } from '../../types';
import './BlockCode.css';

const THEMES: Record<string, unknown> = {
  vscDarkPlus,
  okaidia,
  coy,
  duotoneDark,
  tomorrow,
  atomDark,
  prism,
  solarizedlight,
  gruvboxDark,
  gruvboxLight,
  materialDark,
  materialLight,
  oneDark,
};

const THEME_CATEGORIES: Record<string, string[]> = {
  dark: [
    'vscDarkPlus',
    'okaidia',
    'duotoneDark',
    'atomDark',
    'gruvboxDark',
    'materialDark',
    'oneDark',
  ],
  light: ['coy', 'tomorrow', 'solarizedlight', 'gruvboxLight', 'materialLight', 'prism'],
  all: Object.keys(THEMES),
};

interface BlockCodeProps extends BlockCommonProps {
  nick?: string;
  color?: string;
  code?: string;
  theme?: string;
  onThemeChange?: (theme: string) => void;
}

function BlockCode({
  id,
  nick,
  color,
  code,
  theme = 'vscDarkPlus',
  onThemeChange = () => {},
  ...props
}: BlockCodeProps) {
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [filter, setFilter] = useState('all'); // 'dark' | 'light' | 'all'
  const filteredThemes = THEME_CATEGORIES[filter];

  useEffect(() => {
    if (!filteredThemes.includes(selectedTheme)) {
      const newTheme = filteredThemes[0];
      setSelectedTheme(newTheme);
      onThemeChange(newTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleThemeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value;
    setSelectedTheme(newTheme);
    onThemeChange(newTheme);
  };

  return (
    <BlockBase id={id} {...props}>
      <div className="block-code">
        <div className="block-code-header" style={{ '--glow': color } as React.CSSProperties}>
          <span className="block-code-nick">{nick}</span>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <select
              className="block-code-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ fontSize: '0.7rem' }}
            >
              <option value="all">🌗 All</option>
              <option value="light">🌞 Light</option>
              <option value="dark">🌚 Dart</option>
            </select>

            <select
              className="block-code-select"
              value={selectedTheme}
              onChange={handleThemeSelect}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {filteredThemes.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex' }}>
          <SyntaxHighlighter
            key={selectedTheme}
            language="javascript"
            style={THEMES[selectedTheme] || vscDarkPlus}
            customStyle={{
              flex: 1,
              padding: '8px',
              overflow: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              margin: 0,
              lineHeight: '1.3',
              fontSize: '14px',
            }}
            wrapLines
            showLineNumbers={false}
          >
            {code || ''}
          </SyntaxHighlighter>
        </div>
      </div>
    </BlockBase>
  );
}

export default BlockCode;
