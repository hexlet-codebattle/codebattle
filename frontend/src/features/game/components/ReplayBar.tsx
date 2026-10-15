import { ActionIcon, SegmentedControl, Slider, Text, Tooltip } from '@mantine/core';
import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerSkipBackFilled, IconPlayerSkipForwardFilled } from '@tabler/icons-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatClockDuration } from '@/features/tournament/clock';

import type { ReplayStep } from '../history';
import classes from '../GameRoom.module.css';

// Long thinking pauses are shortened so the replay keeps moving.
const MAX_GAP_MS = 1500;
const SPEEDS = ['1', '2', '4', '8'];

interface ReplayBarProps {
  steps: ReplayStep[];
  index: number;
  onIndex: (index: number) => void;
  /** At the end of the bar (admins: the playbook review). */
  extra?: ReactNode;
}

/** Play / pause, a scrubber over every record (checks marked) and the speed. */
export function ReplayBar({ steps, index, onIndex, extra = null }: ReplayBarProps) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState('2');
  const last = steps.length - 1;
  // Playback stops by itself at the last record.
  const active = playing && index < last;

  useEffect(() => {
    if (!active) return undefined;
    const gap = Math.min(steps[index + 1].at - steps[index].at, MAX_GAP_MS);
    const timer = window.setTimeout(() => {
      onIndex(index + 1);
      if (index + 1 >= last) setPlaying(false);
    }, Math.max(gap, 16) / Number(speed));
    return () => window.clearTimeout(timer);
  }, [active, index, last, steps, speed, onIndex]);

  const marks = useMemo(
    () => steps.flatMap((step, value) => (step.event.type === 'check_complete' || step.event.type === 'give_up' ? [{ value }] : [])),
    [steps],
  );

  const toggle = () => {
    if (!active && index >= last) onIndex(0);
    setPlaying(!active);
  };

  return (
    <div className={classes.replayBar}>
      <Tooltip label={t('To the start')}>
        <ActionIcon variant="subtle" color="gray" onClick={() => onIndex(0)} aria-label={t('To the start')}>
          <IconPlayerSkipBackFilled size={15} />
        </ActionIcon>
      </Tooltip>
      <ActionIcon variant="filled" color="green" size="lg" radius="xl" onClick={toggle} aria-label={active ? t('Pause') : t('Play')}>
        {active ? <IconPlayerPauseFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
      </ActionIcon>
      <Tooltip label={t('To the end')}>
        <ActionIcon variant="subtle" color="gray" onClick={() => onIndex(last)} aria-label={t('To the end')}>
          <IconPlayerSkipForwardFilled size={15} />
        </ActionIcon>
      </Tooltip>
      <Text size="xs" ff="monospace" c="dimmed" className={classes.replayTime}>
        {formatClockDuration(steps[index]?.at ?? 0)} / {formatClockDuration(steps[last]?.at ?? 0)}
      </Text>
      <Slider
        className={classes.replaySlider}
        min={0}
        max={Math.max(last, 1)}
        value={index}
        onChange={(value) => {
          setPlaying(false);
          onIndex(value);
        }}
        marks={marks}
        label={(value) => formatClockDuration(steps[value]?.at ?? 0)}
        color="green"
        size="sm"
        aria-label={t('Replay position')}
      />
      <SegmentedControl size="xs" value={speed} onChange={setSpeed} data={SPEEDS.map((value) => ({ value, label: `${value}×` }))} aria-label={t('Speed')} />
      {extra}
    </div>
  );
}
