import React, { useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ActionIcon, Box, Group, Stack, Text } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';

import { selectDefaultAvatarUrl } from '@/selectors';
import { type RootState, type AppDispatch } from '@/slices/store';

import i18next from '../../i18n';
import { followUser, unfollowUser } from '../middlewares/Main';
import { redirectToNewGame } from '../slices';

import type { Achievement } from './achievementTypes';
import LanguageIcon from './LanguageIcon';
import Loading from './Loading';
import UserAchievements from './UserAchievements';

interface GameStats {
  won: number;
  lost: number;
  gaveUp: number;
}

interface TournamentStats {
  rookieWins: number;
  challengerWins: number;
  proWins: number;
  eliteWins: number;
  mastersWins: number;
  grandSlamWins: number;
}

interface UserStatsUser {
  id?: number | string;
  name?: string;
  lang?: string;
  clan?: string;
  clanName?: string;
  clanLongName?: string;
  avatarUrl?: string;
  points?: number;
  rating?: number;
  rank?: number;
}

interface UserStatsData {
  activeGameId?: number | string;
  user?: UserStatsUser;
  metrics?: {
    gameStats?: GameStats;
    tournamentsStats?: TournamentStats;
  };
  achievements?: Achievement[];
}

interface UserStatsProps {
  data?: UserStatsData;
  user: UserStatsUser & { id: number | string; githubName?: string };
}

interface StatsRowItem {
  key: string;
  label: string;
  value: React.ReactNode;
}

const defaultGameStats: GameStats = { won: 0, lost: 0, gaveUp: 0 };

const defaultTournamentStats: TournamentStats = {
  rookieWins: 0,
  challengerWins: 0,
  proWins: 0,
  eliteWins: 0,
  mastersWins: 0,
  grandSlamWins: 0,
};

const tournamentGrades: { key: keyof TournamentStats; label: string }[] = [
  { key: 'grandSlamWins', label: 'GS' },
  { key: 'mastersWins', label: 'Masters' },
  { key: 'eliteWins', label: 'Elite' },
  { key: 'proWins', label: 'Pro' },
  { key: 'challengerWins', label: 'Challenger' },
  { key: 'rookieWins', label: 'Rookie' },
];

function StatsRow({ items }: { items: StatsRowItem[] }) {
  return (
    <Box
      c="dimmed"
      fz="sm"
      mt={4}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        columnGap: '8px',
      }}
    >
      {items.map(({ key, label, value }) => (
        <Text key={key} component="span" style={{ whiteSpace: 'nowrap' }}>
          {label}
          {': '}
          <Text component="b" c="white">
            {value}
          </Text>
        </Text>
      ))}
    </Box>
  );
}

function UserStats({ data, user: userInfo }: UserStatsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const defaultAvatarUrl = useSelector(selectDefaultAvatarUrl);

  const activeGameId = data?.activeGameId;
  const avatarUrl = userInfo.avatarUrl || data?.user?.avatarUrl || defaultAvatarUrl;
  const name = userInfo.name || data?.user?.name || 'Jon Doe';
  const lang = userInfo.lang || data?.user?.lang || 'js';
  const clan =
    userInfo.clan || data?.user?.clan || data?.user?.clanName || data?.user?.clanLongName;
  const points = data?.user?.points || userInfo.points;
  const rating = data?.user?.rating || userInfo.rating;
  const rank = data?.user?.rank || userInfo.rank;
  const gameStats = data?.metrics?.gameStats || defaultGameStats;
  const tournamentsStats = data?.metrics?.tournamentsStats || defaultTournamentStats;

  const followId = useSelector((state: RootState) => state.gameUI.followId);

  const handlePlayClick = useCallback(() => {
    if (activeGameId) {
      redirectToNewGame(activeGameId);
    }
  }, [activeGameId]);

  const toggleFollowClick = useCallback(() => {
    if (userInfo.id && followId === userInfo.id) {
      dispatch(unfollowUser(userInfo.id as number));
    } else {
      dispatch(followUser(userInfo.id as number, userInfo.name as string | undefined));
    }
  }, [userInfo.id, userInfo.name, followId, dispatch]);

  return (
    <Box p="sm">
      <Stack gap={0} w="100%">
        <Group align="flex-start" justify="space-between" wrap="nowrap">
          <Group align="center" gap="sm" wrap="nowrap" c="white">
            <img
              className="cb-rounded"
              style={{ maxHeight: '42px', width: '42px' }}
              src={avatarUrl}
              alt={i18next.t('User avatar')}
            />
            <Stack gap={0}>
              <Group align="center" gap={4} wrap="nowrap">
                <LanguageIcon lang={lang} />
                <Text component="span" fw={700}>
                  {name}
                </Text>
                {userInfo.githubName && (
                  <Text
                    component="a"
                    href={`https://github.com/${userInfo.githubName}`}
                    title={i18next.t('Github account')}
                    target="_blank"
                    rel="noreferrer"
                    c="white"
                    ml="sm"
                  >
                    <FontAwesomeIcon icon={['fab', 'github']} />
                  </Text>
                )}
              </Group>
              {clan && (
                <Text c="dimmed" fz="sm">
                  {clan}
                </Text>
              )}
            </Stack>
          </Group>
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="transparent"
              title={i18next.t('play active game')}
              c={activeGameId ? 'blue' : 'dimmed'}
              onClick={handlePlayClick}
              disabled={!activeGameId}
            >
              <FontAwesomeIcon icon="play" />
            </ActionIcon>
            <ActionIcon
              variant="transparent"
              title={i18next.t('follow user')}
              c={followId === userInfo.id ? 'red' : 'blue'}
              onClick={toggleFollowClick}
            >
              <FontAwesomeIcon icon="binoculars" />
            </ActionIcon>
          </Group>
        </Group>
        <StatsRow
          items={[
            { key: 'place', label: i18next.t('Place'), value: rank ?? '####' },
            { key: 'points', label: i18next.t('Points'), value: points ?? '####' },
            { key: 'rating', label: i18next.t('Rating'), value: rating ?? '####' },
          ]}
        />
        {data && (
          <>
            <StatsRow
              items={tournamentGrades.slice(0, 3).map(({ key, label }) => ({
                key,
                label,
                value: tournamentsStats[key] ?? 0,
              }))}
            />
            <StatsRow
              items={tournamentGrades.slice(3, 6).map(({ key, label }) => ({
                key,
                label,
                value: tournamentsStats[key] ?? 0,
              }))}
            />
            <StatsRow
              items={[
                { key: 'won', label: i18next.t('Won'), value: gameStats.won },
                { key: 'lost', label: i18next.t('Lost'), value: gameStats.lost },
                { key: 'gaveUp', label: i18next.t('GaveUp'), value: gameStats.gaveUp },
              ]}
            />
          </>
        )}
      </Stack>
      {!data ? <Loading small /> : <UserAchievements achievements={data.achievements} />}
    </Box>
  );
}

export default UserStats;
