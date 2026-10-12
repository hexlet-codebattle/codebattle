import { Button, Group, SimpleGrid, Slider, Stack, Switch, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDeviceGamepad2,
  IconPlayerPlay,
  IconTarget,
  IconVolume,
  IconVolume2,
  IconVolumeOff,
} from '@tabler/icons-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { hasSound, playSound, type SoundEffect, type SoundSettings, type SoundTheme, stopSounds } from '@/shared/sound';

import { type AccountUser, type SettingsResponse, updateSettings } from './api';
import { SaveStatus, Section, useSaveState } from './Section';
import { useSoundMute } from './useSoundMute';
import classes from './Settings.module.css';

const THEMES: { value: SoundTheme; label: string; hint: string; icon: ReactNode }[] = [
  { value: 'dendy', label: 'Dendy', hint: '8-bit console chiptune', icon: <IconDeviceGamepad2 size={20} /> },
  { value: 'cs', label: 'CS', hint: 'Counter-Strike radio', icon: <IconTarget size={20} /> },
  { value: 'standard', label: 'Standard', hint: 'Calm and simple', icon: <IconVolume size={20} /> },
];

const SAMPLES: { effect: SoundEffect; label: string }[] = [
  { effect: 'win', label: 'Win' },
  { effect: 'failure', label: 'Failed tests' },
  { effect: 'round_created', label: 'Round start' },
  { effect: 'time_is_over', label: 'Time is over' },
];

const MARKS = [0, 5, 10].map((value) => ({ value, label: String(value) }));

// "silent" is a legacy type; the switch below replaces it.
const themeOf = (settings: SoundSettings): SoundTheme => (settings.type === 'silent' ? 'dendy' : settings.type);

interface VolumeProps {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onChangeEnd: (value: number) => void;
}

function Volume({ label, value, disabled, onChange, onChangeEnd }: VolumeProps) {
  return (
    <div className={classes.volume}>
      <Group justify="space-between" mb={8}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        <Text size="sm" ff="monospace" fw={700} c={disabled ? 'dimmed' : 'bright'}>
          {value}/10
        </Text>
      </Group>
      <Group gap="sm" wrap="nowrap">
        <IconVolumeOff size={16} style={{ flex: 'none', opacity: 0.6 }} />
        <Slider
          style={{ flex: 1 }}
          min={0}
          max={10}
          step={1}
          marks={MARKS}
          value={value}
          disabled={disabled}
          onChange={onChange}
          onChangeEnd={onChangeEnd}
          label={null}
          color="slate"
          aria-label={label}
        />
        <IconVolume2 size={16} style={{ flex: 'none', opacity: 0.6 }} />
      </Group>
    </div>
  );
}

interface SoundSectionProps {
  account: AccountUser;
  onSaved: (fields: SettingsResponse) => void;
}

export function SoundSection({ account, onSaved }: SoundSectionProps) {
  const { t } = useTranslation();
  const { state, track } = useSaveState();
  const [sound, setSound] = useState<SoundSettings>(account.sound_settings);
  const theme = themeOf(sound);
  // Shared with the header switch.
  const { muted, toggle } = useSoundMute();

  useEffect(() => stopSounds, []);

  const save = async (fields: Partial<SoundSettings>) => {
    setSound((current) => ({ ...current, ...fields }));
    try {
      onSaved(await track(updateSettings({ sound_settings: fields })));
    } catch {
      setSound(account.sound_settings);
      notifications.show({ color: 'red', message: t("Couldn't save your settings. Try again.") });
    }
  };

  return (
    <Section
      id="sound"
      label={t('Sound')}
      icon={<IconVolume size={18} />}
      title={t('Sound settings')}
      description={t('Choose how game and tournament notifications sound.')}
      aside={
        <Group gap="md" wrap="nowrap">
          <SaveStatus state={state} />
          <Switch
            checked={!muted}
            onChange={(event) => void toggle(!event.currentTarget.checked)}
            label={muted ? t('Off') : t('On')}
            labelPosition="left"
            color="green"
            aria-label={t('Sound')}
          />
        </Group>
      }
    >
      <Stack gap="lg" style={{ opacity: muted ? 0.55 : 1, transition: 'opacity 150ms' }}>
        <Stack gap="xs">
          <Text className={classes.subhead}>{t('Sound theme')}</Text>
          <div className={classes.soundThemes} role="radiogroup" aria-label={t('Sound theme')}>
            {THEMES.map(({ value, label, hint, icon }) => {
              const active = value === theme;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={classes.soundTheme}
                  data-active={active || undefined}
                  disabled={muted}
                  onClick={() => {
                    playSound(value, 'win', sound.level);
                    if (!active) void save({ type: value });
                  }}
                >
                  <Group gap={8} wrap="nowrap">
                    {icon}
                    <Text fw={700} inherit>
                      {t(label)}
                    </Text>
                  </Group>
                  <Text size="xs" style={{ opacity: 0.75 }} inherit={false}>
                    {t(hint)}
                  </Text>
                </button>
              );
            })}
          </div>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Volume
            label={t('Game sound level')}
            value={sound.level}
            disabled={muted}
            onChange={(level) => setSound((current) => ({ ...current, level }))}
            onChangeEnd={(level) => {
              playSound(theme, 'win', level);
              void save({ level });
            }}
          />
          <Volume
            label={t('Tournament sound level')}
            value={sound.tournament_level}
            disabled={muted}
            onChange={(tournament_level) => setSound((current) => ({ ...current, tournament_level }))}
            onChangeEnd={(tournament_level) => {
              playSound(theme, 'round_created', tournament_level);
              void save({ tournament_level });
            }}
          />
        </SimpleGrid>

        <Group gap={6}>
          <Text size="xs" c="dimmed" mr={4}>
            {t('Try it:')}
          </Text>
          {SAMPLES.map(({ effect, label }) => (
            <Button
              key={effect}
              size="compact-xs"
              variant="default"
              leftSection={<IconPlayerPlay size={12} />}
              disabled={muted || !hasSound(theme, effect)}
              onClick={() => playSound(theme, effect, sound.level)}
            >
              {t(label)}
            </Button>
          ))}
        </Group>
      </Stack>
    </Section>
  );
}
