import React from 'react';

import { DiRuby } from 'react-icons/di';
import { FaJava, FaPhp } from 'react-icons/fa';
import { FaDartLang } from 'react-icons/fa6';
import {
  SiClojure,
  SiCplusplus,
  SiCss3,
  SiElixir,
  SiGo,
  SiJavascript,
  SiLess,
  SiMongodb,
  SiMysql,
  SiPostgresql,
  SiPython,
  SiRust,
  SiSass,
  SiStylus,
  SiSwift,
  SiTypescript,
  SiZig,
} from 'react-icons/si';
import { TbBrandCSharp, TbBrandKotlin } from 'react-icons/tb';

const DEFAULT_ICON_COLOR = '#c2c9d6';

const renderSimpleIcon = (Icon, {
  className,
  style,
  size = '1.25em',
  color = DEFAULT_ICON_COLOR,
}) => (
  <Icon className={className} style={style} size={size} color={color} />
);

const iconRenderers = {
  clojure: (className, style, color) => renderSimpleIcon(SiClojure, {
      className,
      style,
      color,
      size: '1.125em',
    }),
  cpp: (className, style, color) => renderSimpleIcon(SiCplusplus, {
      className,
      style,
      color,
      size: '1.25em',
    }),
  csharp: (className, style, color) => renderSimpleIcon(TbBrandCSharp, {
      className,
      style,
      color,
      size: '1.25em',
    }),
  css: (className, style, color) => renderSimpleIcon(SiCss3, {
      className,
      style,
      color,
      size: '1.125em',
    }),
  dart: (className, style, color) => renderSimpleIcon(FaDartLang, {
    className,
    style,
    color,
    size: '1.125em',
  }),
  elixir: (className, style, color) => renderSimpleIcon(SiElixir, {
      className,
      style,
      color,
      size: '1.25em',
    }),
  golang: (className, style, color) => renderSimpleIcon(SiGo, {
      className,
      style,
      color,
      size: '1.25em',
    }),
  java: (className, style, color) => renderSimpleIcon(FaJava, {
      className,
      style,
      color,
      size: '1.25em',
    }),
  javascript: (className, style, color) => renderSimpleIcon(SiJavascript, {
      className,
      style,
      color,
      size: '1.25em',
    }),
  js: (className, style, color) => renderSimpleIcon(SiJavascript, {
      className,
      style,
      color,
      size: '1.25em',
    }),
  kotlin: (className, style, color) => renderSimpleIcon(TbBrandKotlin, {
      className,
      style,
      color,
      size: '1.25em',
    }),
  less: (className, style, color) => renderSimpleIcon(SiLess, {
      className,
      style,
      color,
      size: '1.6em',
    }),
  mongodb: (className, style, color) => renderSimpleIcon(SiMongodb, {
      className,
      style,
      color,
      size: '1.3em',
    }),
  mysql: (className, style, color) => renderSimpleIcon(SiMysql, {
      className,
      style,
      color,
      size: '1.3em',
    }),
  php: (className, style, color) => renderSimpleIcon(FaPhp, {
      className,
      style,
      color,
      size: '1.875em',
    }),
  postgresql: (className, style, color) => renderSimpleIcon(SiPostgresql, {
      className,
      style,
      color,
      size: '1.3em',
    }),
  python: (className, style, color) => renderSimpleIcon(SiPython, {
      className,
      style,
      color,
      size: '1.25em',
    }),
  ruby: (className, style, color) => renderSimpleIcon(DiRuby, {
      className,
      style,
      color,
    }),
  rust: (className, style, color) => renderSimpleIcon(SiRust, {
      className,
      style,
      color,
      size: '1.125em',
    }),
  sass: (className, style, color) => renderSimpleIcon(SiSass, {
      className,
      style,
      color,
      size: '1.3em',
    }),
  stylus: (className, style, color) => renderSimpleIcon(SiStylus, {
      className,
      style,
      color,
      size: '1.6em',
    }),
  swift: (className, style, color) => renderSimpleIcon(SiSwift, {
      className,
      style,
      color,
      size: '1.25em',
    }),
  ts: (className, style, color) => renderSimpleIcon(SiTypescript, {
      className,
      style,
      color,
      size: '1.125em',
    }),
  typescript: (className, style, color) => renderSimpleIcon(SiTypescript, {
      className,
      style,
      color,
      size: '1.125em',
    }),
  zig: (className, style, color) => renderSimpleIcon(SiZig, {
      className,
      style,
      color,
      size: '1.125em',
    }),
  default: () => null,
};

function LanguageIcon({
  className = '',
  style = undefined,
  color = DEFAULT_ICON_COLOR,
  title = undefined,
  lang,
}) {
  const renderIcon = iconRenderers[lang] || iconRenderers.default;
  const icon = renderIcon(className, style, color);
  const tooltip = title || lang;

  if (!icon) {
    return null;
  }

  if (!tooltip) {
    return icon;
  }

  return React.cloneElement(icon, { title: tooltip, 'aria-label': tooltip });
}

export default LanguageIcon;
