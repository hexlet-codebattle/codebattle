import { router } from '@inertiajs/react';
import { Center, SegmentedControl, SimpleGrid, Stack, Text, useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCode, IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';
import i18next from 'i18next';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { LangIcon, langName } from '@/shared/LangIcon';

import { type AccountUser, type SettingsResponse, type SettingsUpdate, updateSettings } from './api';
import { SaveStatus, Section, useSaveState } from './Section';
import classes from './Settings.module.css';

// Languages a game can be played in (runner images), CSS processors and databases.
const PLAYING_LANGS = [
  'python', 'js', 'ts', 'ruby', 'golang', 'rust', 'cpp', 'csharp', 'java', 'kotlin', 'php',
  'elixir', 'clojure', 'dart', 'swift', 'zig', 'dlang',
];
const STYLE_LANGS = ['css', 'less', 'sass', 'stylus'];
const DB_TYPES = ['postgresql', 'mysql', 'mongodb'];

interface LangTilesProps {
  langs: string[];
  value: string | null;
  onChange: (lang: string) => void;
  label: string;
  minWidth?: number;
}

function LangTiles({ langs, value, onChange, label, minWidth }: LangTilesProps) {
  return (
    <div
      className={classes.tiles}
      role="radiogroup"
      aria-label={label}
      style={minWidth ? { gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))` } : undefined}
    >
      {langs.map((lang) => {
        const active = lang === value;
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={active}
            className={classes.tile}
            data-active={active || undefined}
            onClick={() => !active && onChange(lang)}
          >
            <LangIcon lang={lang} size={20} withTooltip={false} />
            <span className={classes.tileName}>{langName(lang)}</span>
          </button>
        );
      })}
    </div>
  );
}

interface PreferencesSectionProps {
  account: AccountUser;
  /** Applies a change locally before it is saved (rolled back on failure). */
  onChange: (fields: Partial<AccountUser>) => void;
  onSaved: (fields: SettingsResponse) => void;
}

export function PreferencesSection({ account, onChange, onSaved }: PreferencesSectionProps) {
  const { t, i18n } = useTranslation();
  const { state, track } = useSaveState();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const save = async (fields: SettingsUpdate) => {
    const previous = Object.fromEntries(Object.keys(fields).map((key) => [key, account[key as keyof AccountUser]]));
    onChange(fields as Partial<AccountUser>);
    try {
      const saved = await track(updateSettings(fields));
      onSaved(saved);
      return saved;
    } catch {
      onChange(previous as Partial<AccountUser>);
      notifications.show({ color: 'red', message: t("Couldn't save your settings. Try again.") });
      return null;
    }
  };

  const changeLocale = async (locale: string) => {
    if (!(await save({ locale }))) return;
    await i18next.changeLanguage(locale);
    document.documentElement.lang = locale;
    router.reload({ only: ['locale', 'current_user'] });
  };

  return (
    <Section
      id="preferences"
      label={t('Preferences')}
      icon={<IconCode size={18} />}
      title={t('Coding preferences')}
      description={t('Weapon and locale changes are saved automatically.')}
      aside={<SaveStatus state={state} />}
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Text className={classes.subhead}>{t('Your weapon')}</Text>
          <LangTiles
            langs={PLAYING_LANGS}
            value={account.lang}
            label={t('Programming language select')}
            onChange={(lang) => save({ lang })}
          />
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Stack gap="xs">
            <Text className={classes.subhead}>{t('CSS tasks')}</Text>
            <LangTiles
              langs={STYLE_LANGS}
              value={account.style_lang}
              label={t('CSS tasks')}
              minWidth={110}
              onChange={(style_lang) => save({ style_lang })}
            />
          </Stack>
          <Stack gap="xs">
            <Text className={classes.subhead}>{t('SQL tasks')}</Text>
            <LangTiles
              langs={DB_TYPES}
              value={account.db_type}
              label={t('SQL tasks')}
              minWidth={130}
              onChange={(db_type) => save({ db_type })}
            />
          </Stack>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Stack gap="xs">
            <Text className={classes.subhead}>{t('Language')}</Text>
            <SegmentedControl
              fullWidth
              value={i18n.language === 'ru' ? 'ru' : 'en'}
              onChange={changeLocale}
              data={[
                { value: 'en', label: 'English' },
                { value: 'ru', label: 'Русский' },
              ]}
              aria-label={t('Locale')}
            />
          </Stack>
          <Stack gap="xs">
            <Text className={classes.subhead}>{t('Theme')}</Text>
            <SegmentedControl
              fullWidth
              value={colorScheme}
              onChange={(value) => setColorScheme(value as 'light' | 'dark' | 'auto')}
              data={[
                { value: 'light', label: <SchemeLabel icon={<IconSun size={14} />} label={t('Light')} /> },
                { value: 'dark', label: <SchemeLabel icon={<IconMoon size={14} />} label={t('Dark')} /> },
                { value: 'auto', label: <SchemeLabel icon={<IconDeviceDesktop size={14} />} label={t('System')} /> },
              ]}
              aria-label={t('Theme')}
            />
            <Text size="xs" c="dimmed">
              {t('Saved in this browser.')}
            </Text>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Section>
  );
}

function SchemeLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Center style={{ gap: 6 }}>
      {icon}
      <span>{label}</span>
    </Center>
  );
}
