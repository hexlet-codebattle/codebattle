import { Anchor, Badge, Button, Card, Group, Stack, Table, Text, Title, Tooltip } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import { formatClockDuration } from '@/features/tournament/clock';
import { LangIcon } from '@/shared/LangIcon';

import { formatDateTime, formatDay, modeLabel, resultTone, stateColor, stateLabel } from './format';
import classes from './HeadToHead.module.css';
import type { GameResult, H2HGame, H2HPlayer } from './types';

const PAGE_SIZE = 50;

function ResultBadge({ result, game }: { result: GameResult | null; game: H2HGame }) {
  const tone = resultTone(result, game);

  return (
    <Badge size="sm" variant="light" color={tone.color}>
      {tone.label}
    </Badge>
  );
}

function Duration({ game }: { game: H2HGame }) {
  const { t } = useTranslation();

  if (game.duration_sec) return <>{formatClockDuration(game.duration_sec * 1000)}</>;
  if (!game.timeout_seconds) return <Text span c="dimmed">—</Text>;

  // Unfinished games: the time limit, dimmed.
  return (
    <Tooltip label={t('Time limit')}>
      <Text span c="dimmed">
        / {formatClockDuration(game.timeout_seconds * 1000)}
      </Text>
    </Tooltip>
  );
}

function PlayerHead({ player }: { player: H2HPlayer }) {
  return (
    <span className={classes.playerHead}>
      <LangIcon lang={player.lang} size={14} />
      <Text span size="sm" fw={700} truncate>
        {player.name}
      </Text>
    </span>
  );
}

/** Every game of the pair, newest first; long histories reveal by pages of 50. */
export function GamesTable({ games, players }: { games: H2HGame[]; players: H2HPlayer[] }) {
  const { t } = useTranslation();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [first, second] = players;
  const shown = games.slice(0, limit);

  return (
    <Stack gap="sm">
      <Group justify="center" gap="xs">
        <Title order={3}>{t('All games')}</Title>
        <Badge variant="default" size="lg" ff="monospace">
          {games.length}
        </Badge>
      </Group>

      {games.length === 0 ? (
        <Card>
          <Text c="dimmed" ta="center" py="md">
            {t('No games found for this pair.')}
          </Text>
        </Card>
      ) : (
        <Card padding={0}>
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing={6} fz="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('Game')}</Table.Th>
                  <Table.Th>{t('Date')}</Table.Th>
                  <Table.Th>{t('Level')}</Table.Th>
                  <Table.Th>{t('Mode')}</Table.Th>
                  <Table.Th>{t('State')}</Table.Th>
                  <Table.Th>
                    <PlayerHead player={first} />
                  </Table.Th>
                  <Table.Th>
                    <PlayerHead player={second} />
                  </Table.Th>
                  <Table.Th ta="right">{t('Duration')}</Table.Th>
                  <Table.Th w={36} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {shown.map((game) => (
                  <Table.Tr key={game.id} className={classes.row} data-kind={resultTone(game.first_player_result, game).kind}>
                    <Table.Td>
                      <Anchor href={`/games/${game.id}`} ff="monospace" fw={700} size="sm">
                        #{game.id}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip
                        label={
                          game.finishes_at
                            ? t('Finished %{date}', { date: formatDateTime(game.finishes_at) })
                            : t('Still in progress')
                        }
                      >
                        <Text span size="sm" style={{ whiteSpace: 'nowrap' }}>
                          {formatDay(game.inserted_at)}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={LEVEL_COLORS[game.level] ?? 'gray'}>
                        {levelLabel(game.level)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text span size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                        {modeLabel(game)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={stateColor(game.state)}>
                        {stateLabel(game.state)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <ResultBadge result={game.first_player_result} game={game} />
                    </Table.Td>
                    <Table.Td>
                      <ResultBadge result={game.second_player_result} game={game} />
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace">
                      <Duration game={game} />
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={t('Open game')}>
                        <Anchor href={`/games/${game.id}`} c="dimmed" aria-label={t('Open game')} display="flex">
                          <IconExternalLink size={15} />
                        </Anchor>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      {games.length > limit && (
        <Group justify="center">
          <Button variant="default" size="compact-sm" onClick={() => setLimit(games.length)}>
            {t('Show all')} ({games.length})
          </Button>
        </Group>
      )}
    </Stack>
  );
}
