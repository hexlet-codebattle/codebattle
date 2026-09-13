import React, { memo, useEffect, useMemo, useState } from 'react';

import { camelizeKeys } from 'humps';
import { Box, Flex, Grid, Text, Title } from '@mantine/core';
import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import LanguageIcon from '../../components/LanguageIcon';
import PopoverStickOnHover, { type Placement } from '../../components/PopoverStickOnHover';
import Placements from '../../config/placements';
import { actions } from '../../slices';
import { type AppDispatch } from '../../slices';
import UserStats from '../../components/UserStats';

// Head-to-head payload is a snake_case Inertia prop with a backend-defined shape;
// typed loosely per migration conventions.
/* eslint-disable @typescript-eslint/no-explicit-any */
type H2HPlayer = Record<string, any>;
type H2HGame = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface HeadToHeadPageProps {
  headToHead: {
    players?: H2HPlayer[];
    games?: H2HGame[];
    total_games?: number;
    completed_games?: number;
    draws?: number;
    winner_id?: number | null;
  } | null;
}

const colors = {
  gold: '#e0bf7a',
  silver: '#c2c9d6',
  bronze: '#c48a57',
  platinum: '#a4aab3',
  steel: '#8a919c',
  iron: '#6f7782',
  ink: '#0f1218',
  panel: '#171b22',
  panelAlt: '#1e242d',
  line: '#2b3340',
};

const formatDate = (value: string | number | Date) =>
  new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatDuration = (seconds?: number) => {
  if (!seconds) {
    return i18n.t('n/a');
  }

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  if (minutes === 0) {
    return `${restSeconds}s`;
  }

  return `${minutes}m ${restSeconds}s`;
};

interface HeadToHeadUserPopoverProps {
  user: H2HPlayer;
}

function HeadToHeadUserPopover({ user }: HeadToHeadUserPopoverProps) {
  const dispatch = useDispatch<AppDispatch>();
  // Achievements payload is dynamic backend JSON; typed loosely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/v1/user/${user.id}/achievements`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setStats(camelizeKeys(data));
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          dispatch(actions.setError(error));
        }
      });

    return () => {
      controller.abort();
    };
  }, [dispatch, user.id]);

  return <UserStats user={user as { id: number }} data={stats} />;
}

interface HeadToHeadUserLinkProps {
  user: H2HPlayer;
  // Values come from the untyped `Placements` config (plain strings).
  placement: string;
}

function HeadToHeadUserLink({ user, placement }: HeadToHeadUserLinkProps) {
  const content = useMemo(() => <HeadToHeadUserPopover user={user} />, [user]);

  return (
    <PopoverStickOnHover
      id={`head-to-head-user-${user.id}`}
      placement={placement as Placement}
      component={content}
    >
      <Text component="a" href={`/users/${user.id}`} c="white" td="none">
        {user.name}
      </Text>
    </PopoverStickOnHover>
  );
}

const formatGameState = (state?: string) => {
  if (state === 'game_over') {
    return i18n.t('Finished');
  }

  if (state === 'waiting_opponent') {
    return i18n.t('Waiting');
  }

  if (state === 'timeout') {
    return i18n.t('Timeout');
  }

  if (state === 'playing') {
    return i18n.t('Playing');
  }

  if (state === 'canceled') {
    return i18n.t('Canceled');
  }

  if (!state) {
    return i18n.t('Unknown');
  }

  return state.replaceAll('_', ' ');
};

const getGameStateTone = (state?: string): React.CSSProperties => {
  if (state === 'game_over') {
    return {
      color: colors.gold,
      backgroundColor: 'rgba(224, 191, 122, 0.08)',
      border: '1px solid rgba(224, 191, 122, 0.2)',
    };
  }

  if (state === 'playing') {
    return {
      color: colors.silver,
      backgroundColor: 'rgba(194, 201, 214, 0.08)',
      border: '1px solid rgba(194, 201, 214, 0.18)',
    };
  }

  return {
    color: colors.steel,
    backgroundColor: 'rgba(138, 145, 156, 0.08)',
    border: '1px solid rgba(138, 145, 156, 0.18)',
  };
};

const getPlayerAccent = (winnerId: number | null, playerId: number, index: number) => {
  if (winnerId === playerId) {
    return colors.gold;
  }

  if (winnerId === null) {
    return index === 0 ? colors.silver : colors.platinum;
  }

  return index === 0 ? colors.steel : colors.iron;
};

const getResultTone = (result?: string | null) => {
  if (!result) {
    return {
      label: i18n.t('Pending'),
      background: 'rgba(138, 145, 156, 0.14)',
      color: colors.steel,
      borderColor: 'rgba(138, 145, 156, 0.3)',
    };
  }

  if (result === 'won') {
    return {
      label: i18n.t('Won'),
      background: 'rgba(224, 191, 122, 0.18)',
      color: colors.gold,
      borderColor: 'rgba(224, 191, 122, 0.35)',
    };
  }

  if (result === 'lost') {
    return {
      label: i18n.t('Lost'),
      background: 'rgba(196, 138, 87, 0.18)',
      color: colors.bronze,
      borderColor: 'rgba(196, 138, 87, 0.35)',
    };
  }

  return {
    label: i18n.t('Draw'),
    background: 'rgba(162, 170, 179, 0.16)',
    color: colors.platinum,
    borderColor: 'rgba(162, 170, 179, 0.28)',
  };
};

interface PlayerCardProps {
  player: H2HPlayer;
  winnerId: number | null;
  index: number;
}

function PlayerCard({ player, winnerId, index }: PlayerCardProps) {
  const accent = getPlayerAccent(winnerId, player.id, index);
  const avatarUrl = player.avatar_url || '/assets/images/logo.svg';
  const metaItems: React.ReactNode[] = [];

  if (player.rank) {
    metaItems.push(`#${player.rank}`);
  }

  if (player.rating) {
    metaItems.push(player.rating);
  }

  if (player.points || player.points === 0) {
    metaItems.push(i18n.t('%{count} pts', { count: player.points }));
  }

  return (
    <Box
      h="100%"
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        background: `linear-gradient(145deg, ${colors.panelAlt} 0%, ${colors.ink} 100%)`,
        border: `1px solid ${accent}`,
        boxShadow: `0 16px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.04)`,
      }}
    >
      <Flex direction="column" p="lg" h="100%">
        <Flex align="center" justify="space-between" mb="md">
          <Text
            tt="uppercase"
            size="xs"
            fw={700}
            style={{ color: accent, letterSpacing: '0.12em' }}
          >
            {winnerId === player.id ? i18n.t('Leading') : i18n.t('Contender')}
          </Text>
          <Text
            size="xs"
            fw={700}
            px="xs"
            py={4}

            style={{
              borderRadius: 'var(--mantine-radius-md)',
              border: `1px solid ${accent}`,
              color: accent,
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            {i18n.t('%{count} wins', { count: player.wins })}
          </Text>
        </Flex>
        <Flex align="center">
          <Flex
            align="center"
            justify="center"

            mr="lg"
            style={{
              borderRadius: 'var(--mantine-radius-md)',
              width: '92px',
              height: '92px',
              flexShrink: 0,
              background:
                'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015))',
              border: `1px solid rgba(255, 255, 255, 0.06)`,
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
            }}
          >
            <Box
              component="img"
              src={avatarUrl}
              alt={player.name}

              style={{
                borderRadius: 'var(--mantine-radius-md)',
                width: '72px',
                height: '72px',
                objectFit: 'cover',
              }}
            />
          </Flex>
          <Box flex={1} style={{ minWidth: 0 }}>
            <Box
              mb="md"
              style={{
                fontSize: '2rem',
                lineHeight: 1.1,
                fontWeight: 600,
                letterSpacing: '-0.03em',
              }}
            >
              <HeadToHeadUserLink
                user={player}
                placement={index === 0 ? Placements.bottomStart : Placements.bottomEnd}
              />
            </Box>
            <Flex wrap="wrap" align="center" c="dimmed">
              <Flex
                align="center"
                justify="center"

                mr="md"
                mb="xs"
                style={{
                  borderRadius: 'var(--mantine-radius-md)',
                  width: '34px',
                  height: '34px',
                  color: colors.silver,
                  backgroundColor: 'rgba(194, 201, 214, 0.08)',
                  border: '1px solid rgba(194, 201, 214, 0.15)',
                }}
              >
                <LanguageIcon lang={player.lang} color={colors.silver} />
              </Flex>
              {metaItems.map((item) => (
                <Text
                  key={`${player.id}-${item}`}
                  mr="xs"
                  mb="xs"
                  px="md"
                  py="xs"

                  style={{
                    borderRadius: 'var(--mantine-radius-md)',
                    color: colors.platinum,
                    backgroundColor: 'rgba(164, 170, 179, 0.08)',
                    border: '1px solid rgba(164, 170, 179, 0.12)',
                    fontSize: '1rem',
                  }}
                >
                  {item}
                </Text>
              ))}
            </Flex>
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
}

interface MatchRowProps {
  game: H2HGame;
  players: H2HPlayer[];
}

function MatchRow({ game, players }: MatchRowProps) {
  const [firstPlayer, secondPlayer] = players;
  const firstResultTone = getResultTone(game.first_player_result);
  const secondResultTone = getResultTone(game.second_player_result);
  const gameStateTone = getGameStateTone(game.state);
  const firstResultStyle: React.CSSProperties = {
    background: firstResultTone.background,
    borderRadius: 'var(--mantine-radius-md)',
    color: firstResultTone.color,
    border: `1px solid ${firstResultTone.borderColor}`,
  };
  const secondResultStyle: React.CSSProperties = {
    background: secondResultTone.background,
    borderRadius: 'var(--mantine-radius-md)',
    color: secondResultTone.color,
    border: `1px solid ${secondResultTone.borderColor}`,
  };

  return (
    <Box
      p={{ base: 'md', lg: 'lg' }}
      mb="md"
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        background: `linear-gradient(140deg, ${colors.panel} 0%, ${colors.ink} 100%)`,
        border: `1px solid ${colors.line}`,
        boxShadow: '0 14px 30px rgba(0, 0, 0, 0.18)',
      }}
    >
      <Flex
        direction={{ base: 'column', lg: 'row' }}
        justify="space-between"
        align={{ lg: 'center' }}
        mb="md"
      >
        <Box mb={{ base: 'xs', lg: 0 }}>
          <Text
            tt="uppercase"
            size="xs"
            fw={700}
            style={{ color: colors.steel, letterSpacing: '0.12em' }}
          >
            {i18n.t('Game')} #{game.id}
          </Text>
          <Text component="h5" c="white">
            {game.mode} • {game.level} • {game.task_type}
          </Text>
        </Box>
        <Flex direction="column" align={{ lg: 'flex-end' }}>
          <Text size="xs" c="dimmed" mb={{ base: 'xs', lg: 4 }}>
            {formatDate(game.inserted_at)}
          </Text>
          <Text
            component="a"
            href={`/games/${game.id}`}
            tt="uppercase"
            size="xs"
            fw={700}
            td="none"
            style={{ color: colors.gold, letterSpacing: '0.12em' }}
          >
            {i18n.t('Open game')}
          </Text>
        </Flex>
      </Flex>

      <Grid gap={0}>
        <Grid.Col span={{ base: 12, lg: 5 }} mb={{ base: 'md', lg: 0 }}>
          <Flex align="center" h="100%">
            <HeadToHeadUserLink user={firstPlayer} placement={Placements.bottomStart} />
            <Text ml="md" px="md" py="xs" style={firstResultStyle}>
              {firstResultTone.label}
            </Text>
          </Flex>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 2 }} mb={{ base: 'md', lg: 0 }}>
          <Flex align="center" justify={{ lg: 'center' }} h="100%">
            <Text
              tt="uppercase"
              size="xs"
              fw={700}
              px="md"
              py="xs"

              style={{
                borderRadius: 'var(--mantine-radius-md)',
                ...gameStateTone,
                letterSpacing: '0.08em',
              }}
            >
              {formatGameState(game.state)}
            </Text>
          </Flex>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Flex align="center" justify={{ lg: 'flex-end' }} h="100%">
            <HeadToHeadUserLink user={secondPlayer} placement={Placements.bottomEnd} />
            <Text ml="md" px="md" py="xs" style={secondResultStyle}>
              {secondResultTone.label}
            </Text>
          </Flex>
        </Grid.Col>
      </Grid>

      <Flex
        wrap="wrap"
        justify="space-between"
        align="center"
        mt="md"
        pt="md"
        style={{
          borderTop: `1px solid ${colors.line}`,
        }}
      >
        <Text size="xs" style={{ color: colors.platinum }}>
          {i18n.t('Duration: %{duration}', {
            duration: formatDuration(game.duration_sec || game.timeout_seconds),
          })}
        </Text>
        <Text size="xs" style={{ color: colors.iron }}>
          {game.finishes_at
            ? i18n.t('Finished %{date}', { date: formatDate(game.finishes_at) })
            : i18n.t('Still in progress')}
        </Text>
      </Flex>
    </Box>
  );
}

interface SummaryStatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  tone: string;
}

function SummaryStat({ label, value, tone }: SummaryStatProps) {
  return (
    <Box
      p="md"
      h="100%"
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        background: `linear-gradient(145deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))`,
        border: `1px solid ${tone}`,
      }}
    >
      <Text tt="uppercase" size="xs" fw={700} style={{ color: tone, letterSpacing: '0.1em' }}>
        {label}
      </Text>
      <Text fz={{ base: 40, md: 56 }} lh={1.2} fw={700} c="white">
        {value}
      </Text>
    </Box>
  );
}

function HeadToHeadPage({ headToHead }: HeadToHeadPageProps) {
  if (!headToHead) {
    return null;
  }

  const players: H2HPlayer[] = headToHead.players || [];
  const games: H2HGame[] = headToHead.games || [];

  return (
    <Box
      c="cbText"
      mih="100vh"
      py="xl"
      style={{
        background:
          'radial-gradient(circle at top, rgba(224, 191, 122, 0.08), transparent 30%), linear-gradient(180deg, #0b0e13 0%, #121720 40%, #0d1118 100%)',
      }}
    >
      <Box w="100%" maw={1140} mx="auto" px="md">
        <Box
          p={{ base: 'lg', lg: 'xl' }}
          mb="md"
          style={{
            borderRadius: 'var(--mantine-radius-md)',
            background: `linear-gradient(135deg, ${colors.ink} 0%, ${colors.panel} 55%, ${colors.panelAlt} 100%)`,
            border: `1px solid ${colors.line}`,
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
          }}
        >
          <Box mb="lg">
            <Text
              tt="uppercase"
              size="xs"
              fw={700}
              mb="xs"
              style={{ color: colors.gold, letterSpacing: '0.18em' }}
            >
              {i18n.t('H2H Arena')}
            </Text>
            <Title order={1} mb="sm" c="white">
              {players.map((player) => player.name).join(' vs ')}
            </Title>
            <Text style={{ color: colors.platinum }}>
              {i18n.t(
                'Direct duel history with profile links, live status, and every shared game.',
              )}
            </Text>
          </Box>

          <Grid gap={30} mb="lg">
            <Grid.Col span={{ base: 12, md: 4 }} mb="md">
              <SummaryStat
                label={i18n.t('Total games')}
                value={headToHead.total_games}
                tone={colors.gold}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }} mb="md">
              <SummaryStat
                label={i18n.t('Completed')}
                value={headToHead.completed_games}
                tone={colors.silver}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }} mb="md">
              <SummaryStat label={i18n.t('Draws')} value={headToHead.draws} tone={colors.bronze} />
            </Grid.Col>
          </Grid>

          <Grid gap={30}>
            {players.map((player, index) => (
              <Grid.Col key={player.id} span={{ base: 12, lg: 6 }} mb="md">
                <PlayerCard player={player} winnerId={headToHead.winner_id ?? null} index={index} />
              </Grid.Col>
            ))}
          </Grid>
        </Box>

        <Flex justify="space-between" align="center" mb="md">
          <Title order={2} style={{ color: colors.silver }}>
            {i18n.t('All games')}
          </Title>
          <Text size="xs" style={{ color: colors.steel }}>
            {i18n.t('%{count} records', { count: games.length })}
          </Text>
        </Flex>

        {games.length === 0 ? (
          <Box
            p="lg"
            ta="center"
            style={{
              borderRadius: 'var(--mantine-radius-md)',
              background: `linear-gradient(145deg, ${colors.panel} 0%, ${colors.ink} 100%)`,
              border: `1px solid ${colors.line}`,
            }}
          >
            {i18n.t('No games found for this pair.')}
          </Box>
        ) : (
          games.map((game) => <MatchRow key={game.id} game={game} players={players} />)
        )}
      </Box>
    </Box>
  );
}

export default memo(HeadToHeadPage);
