import { Button, Group, ScrollArea, Stack, Table, Text } from '@mantine/core';
import { IconCircleCheckFilled, IconCircleXFilled } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDuration, type ParticipantStage } from './participant';
import classes from './PublicEvent.module.css';

const DASH = '—';

function StageAction({ stage, onStart }: { stage: ParticipantStage; onStart: (stage: ParticipantStage) => void }) {
  const { t } = useTranslation();

  if (!stage.available) return <Text c="dimmed">{DASH}</Text>;

  if (stage.type === 'entrance') {
    return stage.passed ? (
      <Group gap={4} justify="center" wrap="nowrap" className={classes.passed}>
        <IconCircleCheckFilled size={16} />
        <Text size="sm" fw={600}>
          {t('Passed')}
        </Text>
      </Group>
    ) : (
      <Group gap={4} justify="center" wrap="nowrap" className={classes.notPassed}>
        <IconCircleXFilled size={16} />
        <Text size="sm" fw={600}>
          {t('Not passed')}
        </Text>
      </Group>
    );
  }

  const label = t(stage.actionText || 'Start');

  if (stage.userStatus === 'completed') {
    return (
      <Button size="compact-sm" variant="default" disabled>
        {label}
      </Button>
    );
  }

  if (stage.groupTournamentId) {
    return (
      <Button component="a" href={`/group_tournaments/${stage.groupTournamentId}`} size="compact-sm" variant="default">
        {label}
      </Button>
    );
  }

  if (stage.userStatus === 'started' && stage.tournamentId) {
    return (
      <Button component="a" href={`/tournaments/${stage.tournamentId}?auto_join=1`} size="compact-sm" variant="default">
        {label}
      </Button>
    );
  }

  return (
    <Button size="compact-sm" variant="default" onClick={() => onStart(stage)}>
      {label}
    </Button>
  );
}

/** A main value with an optional second line (legacy shows tournament and AI-round figures stacked). */
function Pair({ main, secondary }: { main: ReactNode; secondary?: ReactNode }) {
  return (
    <Stack gap={0} align="center">
      <span className={classes.num}>{main}</span>
      {secondary && <span className={`${classes.num} ${classes.secondary}`}>{secondary}</span>}
    </Stack>
  );
}

interface StageTableProps {
  stages: ParticipantStage[];
  onStart: (stage: ParticipantStage) => void;
}

export function StageTable({ stages, onStart }: StageTableProps) {
  const { t } = useTranslation();

  return (
    <ScrollArea type="auto">
      <Table miw={760} verticalSpacing={8} className={classes.table}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('Stage')}</Table.Th>
            <Table.Th>{t('Action')}</Table.Th>
            <Table.Th>{t('Place in total')}</Table.Th>
            <Table.Th>{t('Place in category')}</Table.Th>
            <Table.Th>{t('Score/Total')}</Table.Th>
            <Table.Th>{t('Time spent')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {stages.map((stage) => {
            const isTournament = stage.type === 'tournament';
            const games = stage.gamesCount === null ? DASH : `${stage.winsCount ?? 0}/${stage.gamesCount}`;
            const ai =
              stage.aiScore === null ? null : `${stage.aiScore}${stage.maxScore !== null ? `/${stage.maxScore}` : ''}`;

            return (
              <Table.Tr key={stage.slug}>
                <Table.Td>
                  <Text size="sm" fw={600} c="bright">
                    {stage.name}
                  </Text>
                  {stage.dates && (
                    <Text size="xs" c="dimmed">
                      {stage.dates}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <StageAction stage={stage} onStart={onStart} />
                </Table.Td>
                <Table.Td className={classes.num}>{isTournament ? (stage.placeInTotal ?? DASH) : DASH}</Table.Td>
                <Table.Td className={classes.num}>{isTournament ? (stage.placeInCategory ?? DASH) : DASH}</Table.Td>
                <Table.Td>{isTournament ? <Pair main={games} secondary={ai} /> : DASH}</Table.Td>
                <Table.Td>
                  {isTournament ? (
                    <Pair
                      main={formatDuration(stage.tournamentSeconds) ?? DASH}
                      secondary={formatDuration(stage.groupTournamentSeconds)}
                    />
                  ) : (
                    DASH
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
