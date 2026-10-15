import { Button, Group, SimpleGrid, Slider, Stack, Switch, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlayerPlay, IconVolume, IconVolume2, IconVolumeOff } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  playSound,
  playTournamentSound,
  type SoundEffect,
  type SoundSettings,
  stopSounds,
  type TournamentSound,
  useSoundStore,
} from '@/shared/sound';

import { type AccountUser, type SettingsResponse, updateSettings } from './api';
import { SaveStatus, Section, useSaveState } from './Section';
import { useSoundMute } from './useSoundMute';
import classes from './Settings.module.css';

// Every cue the app plays, in the order a game / tournament hits them.
const GAME_SAMPLES: { effect: SoundEffect; label: string }[] = [
  { effect: 'round_created', label: 'Game started' },
  { effect: 'check', label: 'Run tests' },
  { effect: 'failure', label: 'Failed tests' },
  { effect: 'win', label: 'Win' },
  { effect: 'give_up', label: 'Gave up' },
  { effect: 'time_is_over', label: 'Time is over' },
  { effect: 'message', label: 'New message' },
];

const TOURNAMENT_SAMPLES: { cue: TournamentSound; label: string }[] = [
  { cue: 'started', label: 'Tournament start' },
  { cue: 'roundStarted', label: 'Round start' },
  { cue: 'roundFinished', label: 'Round end' },
  { cue: 'finished', label: 'Tournament end' },
];

interface SampleRowProps {
  label: string;
  samples: { key: string; label: string; play: () => void }[];
  disabled: boolean;
}

function SampleRow({ label, samples, disabled }: SampleRowProps) {
  const { t } = useTranslation();

  return (
    <Group gap={6}>
      <Text size="xs" c="dimmed" w={88}>
        {label}
      </Text>
      {samples.map((sample) => (
        <Button
          key={sample.key}
          size="compact-xs"
          variant="default"
          leftSection={<IconPlayerPlay size={12} />}
          disabled={disabled}
          onClick={sample.play}
        >
          {t(sample.label)}
        </Button>
      ))}
    </Group>
  );
}

const MARKS = [0, 5, 10].map((value) => ({ value, label: String(value) }));

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
  // Shared with the header switch.
  const { muted, toggle } = useSoundMute();

  useEffect(() => stopSounds, []);

  const save = async (fields: Partial<SoundSettings>) => {
    setSound((current) => ({ ...current, ...fields }));
    useSoundStore.getState().setSettings(fields);
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
      description={t('Set the volume of game and tournament sounds.')}
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
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Volume
            label={t('Game sound level')}
            value={sound.level}
            disabled={muted}
            onChange={(level) => setSound((current) => ({ ...current, level }))}
            onChangeEnd={(level) => {
              playSound('win', level);
              void save({ level });
            }}
          />
          <Volume
            label={t('Tournament sound level')}
            value={sound.tournament_level}
            disabled={muted}
            onChange={(tournament_level) => setSound((current) => ({ ...current, tournament_level }))}
            onChangeEnd={(tournament_level) => {
              stopSounds();
              playTournamentSound('roundStarted', tournament_level);
              void save({ tournament_level });
            }}
          />
        </SimpleGrid>

        <Stack gap={8}>
          <Text size="xs" c="dimmed">
            {t('Try it:')}
          </Text>
          <SampleRow
            label={t('Game')}
            disabled={muted}
            samples={GAME_SAMPLES.map(({ effect, label }) => ({
              key: effect,
              label,
              play: () => playSound(effect, sound.level),
            }))}
          />
          <SampleRow
            label={t('Tournament')}
            disabled={muted}
            samples={TOURNAMENT_SAMPLES.map(({ cue, label }) => ({
              key: cue,
              label,
              play: () => {
                stopSounds();
                playTournamentSound(cue, sound.tournament_level);
              },
            }))}
          />
        </Stack>
      </Stack>
    </Section>
  );
}
