import { Tooltip } from '@mantine/core';
import { IconCode } from '@tabler/icons-react';
import type { IconType } from 'react-icons';
import { DiRuby } from 'react-icons/di';
import { FaJava, FaPhp } from 'react-icons/fa';
import { FaDartLang } from 'react-icons/fa6';
import {
  SiClojure,
  SiCplusplus,
  SiCss,
  SiD,
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

import { t } from '@/i18n';

import classes from './LangIcon.module.css';

// Brand glyph and optical scale per language (some marks are drawn smaller
// inside their viewBox), plus the name shown on hover.
const ICONS: Record<string, { icon: IconType; scale?: number; name: string }> = {
  clojure: { icon: SiClojure, scale: 0.9, name: 'Clojure' },
  cpp: { icon: SiCplusplus, name: 'C++' },
  csharp: { icon: TbBrandCSharp, name: 'C#' },
  css: { icon: SiCss, scale: 0.9, name: 'CSS' },
  dart: { icon: FaDartLang, scale: 0.9, name: 'Dart' },
  dlang: { icon: SiD, scale: 0.9, name: 'D' },
  elixir: { icon: SiElixir, name: 'Elixir' },
  golang: { icon: SiGo, scale: 1.2, name: 'Go' },
  java: { icon: FaJava, name: 'Java' },
  js: { icon: SiJavascript, scale: 0.9, name: 'JavaScript' },
  kotlin: { icon: TbBrandKotlin, name: 'Kotlin' },
  less: { icon: SiLess, scale: 1.25, name: 'Less' },
  mongodb: { icon: SiMongodb, name: 'MongoDB' },
  mysql: { icon: SiMysql, scale: 1.1, name: 'MySQL' },
  php: { icon: FaPhp, scale: 1.4, name: 'PHP' },
  postgresql: { icon: SiPostgresql, name: 'PostgreSQL' },
  python: { icon: SiPython, name: 'Python' },
  ruby: { icon: DiRuby, scale: 1.1, name: 'Ruby' },
  rust: { icon: SiRust, scale: 0.95, name: 'Rust' },
  sass: { icon: SiSass, name: 'Sass' },
  stylus: { icon: SiStylus, scale: 1.25, name: 'Stylus' },
  swift: { icon: SiSwift, name: 'Swift' },
  ts: { icon: SiTypescript, scale: 0.9, name: 'TypeScript' },
  zig: { icon: SiZig, name: 'Zig' },
};

const ALIASES: Record<string, string> = { javascript: 'js', typescript: 'ts', go: 'golang', 'c++': 'cpp', 'c#': 'csharp' };

export const langName = (lang: string) => ICONS[ALIASES[lang] ?? lang]?.name ?? lang;

interface LangIconProps {
  lang: string | null | undefined;
  /** Box size in px; the glyph is scaled inside it so names line up in lists. */
  size?: number;
  /** Show the language name on hover (off inside other tooltips). */
  withTooltip?: boolean;
}

// Users who never picked a language still get a glyph, so every name lines up.
const FALLBACK = { icon: IconCode as unknown as IconType, scale: 0.9, name: '' };

/** Monochrome language logo (Python, Ruby, JS…) shown before user names, like the legacy UI. */
export function LangIcon({ lang, size = 16, withTooltip = true }: LangIconProps) {
  const known = lang ? ICONS[ALIASES[lang] ?? lang] : undefined;
  const entry = known ?? FALLBACK;
  const label = known ? known.name : lang || t('Language not set');

  const Icon = entry.icon;
  const icon = (
    <span
      className={classes.box}
      data-fallback={known ? undefined : true}
      style={{ width: size, height: size }}
      aria-label={label}
      role="img"
    >
      <Icon size={Math.round(size * (entry.scale ?? 1))} aria-hidden />
    </span>
  );

  return withTooltip ? (
    <Tooltip label={label} openDelay={400}>
      {icon}
    </Tooltip>
  ) : (
    icon
  );
}
