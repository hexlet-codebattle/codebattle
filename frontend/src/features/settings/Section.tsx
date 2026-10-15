import { Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import classes from './Settings.module.css';

interface SectionProps {
  /** Anchor id; the side nav links to it. */
  id: string;
  /** Short name in the side nav. */
  label: string;
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  /** Right side of the heading: a toggle, a save status… */
  aside?: ReactNode;
  danger?: boolean;
  children: ReactNode;
}

/** One settings card; `data-settings-anchor` feeds the side nav's scroll spy. */
export function Section({ id, label, icon, title, description, aside, danger, children }: SectionProps) {
  return (
    <Card
      id={id}
      className={classes.section}
      padding="lg"
      data-settings-anchor
      data-label={label}
      data-danger={danger || undefined}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="lg" gap="md">
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <span className={classes.sectionIcon} aria-hidden>
            {icon}
          </span>
          <Stack gap={2}>
            <Title order={4}>{title}</Title>
            {description && (
              <Text size="sm" c="dimmed">
                {description}
              </Text>
            )}
          </Stack>
        </Group>
        {aside}
      </Group>
      {children}
    </Card>
  );
}

export type SaveState = 'idle' | 'saving' | 'saved';

/** "Saving…" / "Saved" next to sections that save as you change them. */
export function SaveStatus({ state }: { state: SaveState }) {
  const { t } = useTranslation();

  if (state === 'idle') return null;

  return (
    <Group gap={6} wrap="nowrap" c="dimmed" fz="xs" style={{ whiteSpace: 'nowrap' }} aria-live="polite">
      {state === 'saving' ? <Loader size={12} /> : <IconCheck size={14} />}
      {state === 'saving' ? t('Saving...') : t('Saved')}
    </Group>
  );
}

/** Tracks a section's auto-saves: `track(promise)` drives the status, which fades after a moment. */
export function useSaveState() {
  const [state, setState] = useState<SaveState>('idle');
  const pending = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const track = useCallback(async <T,>(promise: Promise<T>) => {
    pending.current += 1;
    clearTimeout(timer.current);
    setState('saving');
    const settle = (ok: boolean) => {
      pending.current -= 1;
      if (pending.current > 0) return;
      setState(ok ? 'saved' : 'idle');
      timer.current = setTimeout(() => setState('idle'), 2000);
    };
    try {
      const result = await promise;
      settle(true);
      return result;
    } catch (error) {
      settle(false);
      throw error;
    }
  }, []);

  return { state, track };
}
