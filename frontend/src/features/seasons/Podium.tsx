import { Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { UserCard } from '@/features/users/UserCard';
import { LangIcon } from '@/shared/LangIcon';
import { UserAvatar } from '@/shared/UserAvatar';

import classes from './Seasons.module.css';
import type { SeasonResult } from './types';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Stack gap={0} align="center">
      <Text size="sm" ff="monospace" fw={700} c="bright">
        {value}
      </Text>
      <Text fz={10} c="dimmed" tt="uppercase" lts="0.04em">
        {label}
      </Text>
    </Stack>
  );
}

interface PodiumProps {
  results: SeasonResult[];
  /** Opens the player's season insights. */
  onSelect?: (result: SeasonResult) => void;
}

/** Top three of a season: 2nd · 1st · 3rd, gold / silver / bronze. */
export function Podium({ results, onSelect }: PodiumProps) {
  const { t } = useTranslation();
  const top = results.filter((result) => result.place >= 1 && result.place <= 3);

  if (top.length === 0) return null;

  return (
    <div className={classes.podium}>
      {top.map((result) => {
        const first = result.place === 1;
        const user = { id: result.user_id, name: result.user_name, avatar_url: result.avatar_url, lang: result.user_lang };

        return (
          <div key={result.user_id} className={classes.step} data-place={result.place}>
            <span className={classes.stepPlace}>{result.place}</span>
            <UserAvatar user={user} size={first ? 72 : 56} radius="md" />
            <Group gap={6} wrap="nowrap" justify="center" maw="100%">
              <LangIcon lang={result.user_lang} size={first ? 18 : 16} />
              <UserCard user={user}>
                <Text fw={700} fz={first ? 'lg' : 'md'} c="bright" truncate>
                  {result.user_name}
                </Text>
              </UserCard>
            </Group>
            <Text size="xs" c="dimmed" truncate maw="100%">
              {result.clan_name || ' '}
            </Text>
            <UnstyledButton onClick={() => onSelect?.(result)} disabled={!onSelect} aria-label={t('View player insights')}>
              <Text ff="var(--cb-font-display)" fz={first ? 34 : 26} fw={800} c="bright" lh={1.1}>
                {result.total_points}
              </Text>
              <Text size="xs" c="dimmed">
                {t('points')}
              </Text>
            </UnstyledButton>
            <div className={classes.stepStats}>
              <Stat label={t('Wins')} value={result.total_wins_count} />
              <Stat label={t('Tournaments')} value={result.tournaments_count} />
              <Stat label={t('Score')} value={result.total_score} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
