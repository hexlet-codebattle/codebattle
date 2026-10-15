import { Button, Group, List, Modal, Stack, Table, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBook2, IconCrown } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useSharedProps } from '@/shared/useSharedProps';

import { gradeLabel } from '../format';
import type { TournamentGrade } from '../types';

import { GradeIcon } from './GradeIcon';
import classes from './LeagueBanner.module.css';

// Season points by final place; everyone else who finished gets 2 (legacy league rules).
export const LEAGUE_GRADES: { grade: TournamentGrade; players: number; rounds: number; points: number[] }[] = [
  { grade: 'rookie', players: 8, rounds: 4, points: [8, 4, 2] },
  { grade: 'challenger', players: 16, rounds: 6, points: [16, 8, 4, 2] },
  { grade: 'pro', players: 32, rounds: 8, points: [128, 64, 32, 16, 8, 4, 2] },
  { grade: 'elite', players: 64, rounds: 10, points: [256, 128, 64, 32, 16, 8, 4, 2] },
  { grade: 'masters', players: 128, rounds: 12, points: [1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] },
  { grade: 'grand_slam', players: 256, rounds: 14, points: [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] },
];

export function RulesModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Modal opened={opened} onClose={onClose} title={t('Codebattle League rules')} size="lg">
      <Stack gap="lg">
        <Stack gap={6}>
          <Title order={5}>{t('Seasons')}</Title>
          <Text size="sm">
            {t(
              'Four seasons a year: Sep 21 – Dec 21, Dec 21 – Mar 21, Mar 21 – Jun 21, Jun 21 – Sep 21. Season points reset every season; Elo rating never does. Each season ends with a Grand Slam on the 21st at 16:00 UTC.',
            )}
          </Text>
        </Stack>

        <Stack gap={6}>
          <Title order={5}>{t('Grades')}</Title>
          <Text size="sm">
            {t(
              'Rookie runs every 4 hours, Challenger daily at 16:00 UTC. One weekly tournament takes the 16:00 slot, by priority Grand Slam › Masters › Elite › Pro. Open tournaments are created by players and award no points.',
            )}
          </Text>
          <Table.ScrollContainer minWidth={420}>
            <Table verticalSpacing={6}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('Grade')}</Table.Th>
                  <Table.Th ta="right">{t('Players')}</Table.Th>
                  <Table.Th ta="right">{t('Rounds')}</Table.Th>
                  <Table.Th ta="right">{t('1st place')}</Table.Th>
                  <Table.Th ta="right">{t('Prize places')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {LEAGUE_GRADES.map(({ grade, players, rounds, points }) => (
                  <Table.Tr key={grade}>
                    <Table.Td>
                      <Group gap={8} wrap="nowrap">
                        <GradeIcon grade={grade} size={22} />
                        <Text size="sm" fw={600} c="bright">
                          {gradeLabel(grade)}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace">
                      {players}
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace">
                      {rounds}
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace" fw={700} style={{ color: `var(--cb-grade-${grade})` }}>
                      {points[0]}
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace">
                      {t('top %{count}', { count: points.length })}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Text size="xs" c="dimmed">
            {t(
              "Points halve with each place down to 2; every other finisher gets 2 points. Prize and participation points don't stack.",
            )}
          </Text>
        </Stack>

        <Stack gap={6}>
          <Title order={5}>{t('Season ranking')}</Title>
          <List size="sm" type="ordered" spacing={2}>
            <List.Item>{t('Total season points')}</List.Item>
            <List.Item>{t('Tournament wins this season')}</List.Item>
            <List.Item>{t('Tournaments played this season')}</List.Item>
          </List>
          <Text size="sm">{t('Season and Grand Slam champions enter the Hall of Fame.')}</Text>
        </Stack>
      </Stack>
    </Modal>
  );
}

/** One-line pitch for the seasonal league, with rules and the Hall of Fame one click away. */
export function LeagueBanner() {
  const { t } = useTranslation();
  const { current_user: user } = useSharedProps();
  const [rulesOpened, rules] = useDisclosure(false);

  // Marketing for newcomers only: users.points is this season's total and every
  // finisher of a season tournament gets at least 2, so 0 means "not played yet".
  if (user.points) return null;

  return (
    <div className={classes.banner}>
      <Group gap="sm" wrap="nowrap">
        <GradeIcon grade="grand_slam" size={36} />
        <Stack gap={0} miw={0} flex={1}>
          <Text fw={700} c="bright">
            {t('Codebattle League')}
          </Text>
          <Text size="xs" c="dimmed">
            {t(
              'Play season games, earn points, and compete for your place in the Hall of Fame. Each season’s winner takes home exclusive Codebattle merch.',
            )}
          </Text>
        </Stack>
      </Group>
      <div className={classes.actions}>
        <Button variant="default" size="compact-sm" leftSection={<IconBook2 size={14} />} onClick={rules.open}>
          {t('Rules')}
        </Button>
        <Button component="a" href="/hall_of_fame" variant="light" size="compact-sm" leftSection={<IconCrown size={14} />}>
          {t('Hall of Fame')}
        </Button>
      </div>
      <RulesModal opened={rulesOpened} onClose={rules.close} />
    </div>
  );
}
