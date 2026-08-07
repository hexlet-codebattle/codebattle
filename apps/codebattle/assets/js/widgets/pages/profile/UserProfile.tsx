import React, { useState, useEffect, useMemo } from 'react';

import { Anchor, Box, Flex, Grid, Tabs, Text } from '@mantine/core';
import { camelizeKeys } from 'humps';
import sum from 'lodash/sum';
import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import LanguageIcon from '../../components/LanguageIcon';
import Loading from '../../components/Loading';
import { actions } from '../../slices';
import CompletedGames from '../lobby/CompletedGames';

import Achievement from './Achievement';
import type { Achievement as AchievementType } from '../../components/achievementTypes';
import Heatmap from './Heatmap';
import UserStatCharts from './UserStatCharts';
import UserTournaments from './UserTournaments';

interface ProfileUser {
  avatarUrl?: string;
  clan?: string;
  clanId?: number | string | null;
  githubName?: string;
  insertedAt: string;
  isBot?: boolean;
  lang?: string;
  name: string;
  points?: number;
  rank?: number;
  rating?: number;
}

interface ProfileMetrics {
  gameStats?: Record<string, number>;
  languageStats?: Record<string, number>;
  tournamentsStats?: Record<string, number>;
}

interface SeasonResult {
  place: number;
  seasonId: number | string;
  seasonName: string;
  seasonYear: number | string;
}

interface UserData {
  achievements: AchievementType[];
  metrics?: ProfileMetrics;
  seasonResults?: SeasonResult[];
  user: ProfileUser;
}

interface Rival {
  clan?: string;
  id: number | string;
  lossesCount: number;
  name: string;
  timeoutsCount: number;
  winsCount: number;
}

type RivalsStatus = 'idle' | 'loading' | 'loaded' | 'error';

const hiddenAchievementTypes = new Set(['game_stats', 'tournaments_stats']);
const seasonPlaceColors = {
  gold: '#e0bf7a',
  silver: '#c2c9d6',
  bronze: '#c48a57',
  platinum: '#a4aab3',
};

const getSeasonPlaceColor = (place: number) => {
  if (place === 1) return seasonPlaceColors.gold;
  if (place === 2) return seasonPlaceColors.silver;
  if (place === 3) return seasonPlaceColors.bronze;
  return seasonPlaceColors.platinum;
};

function UserProfile() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [topRivals, setTopRivals] = useState<Rival[]>([]);
  const [rivalsStatus, setRivalsStatus] = useState<RivalsStatus>('idle');
  const [activeTab, setActiveTab] = useState('statistics');
  const dispatch = useDispatch();
  const userId = useMemo(() => window.location.pathname.split('/').pop(), []);

  useEffect(() => {
    fetch(`/api/v1/user/${userId}/stats`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        setUserData(camelizeKeys(data));
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
  }, [dispatch, userId]);

  useEffect(() => {
    setRivalsStatus('loading');

    fetch(`/api/v1/user/${userId}/rivals`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const payload = camelizeKeys(data);
        setTopRivals(payload.topRivals || []);
        setRivalsStatus('loaded');
      })
      .catch(() => {
        setTopRivals([]);
        setRivalsStatus('error');
      });
  }, [userId]);

  if (!userData) {
    return <Loading />;
  }

  const { metrics, user, achievements } = userData;
  const visibleAchievements = achievements.filter((item) => !hiddenAchievementTypes.has(item.type));
  const gameStats = metrics?.gameStats || { won: 0, lost: 0, gaveUp: 0 };
  const seasonResults = userData?.seasonResults || [];
  const languageStats = metrics?.languageStats || {};
  const tournamentStats = metrics?.tournamentsStats || {
    rookieWins: 0,
    challengerWins: 0,
    proWins: 0,
    eliteWins: 0,
    mastersWins: 0,
    grandSlamWins: 0,
  };
  const userInsertedAt = new Date(user.insertedAt).toLocaleString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const hasClan = Boolean(user.clan && user.clan.trim().length > 0);
  const languageEntries = Object.entries(languageStats).sort((a, b) => b[1] - a[1]);
  const gamesCount = sum(Object.values(gameStats));
  const languageGamesCount = sum(Object.values(languageStats));
  const tournamentWinsCount = sum(Object.values(tournamentStats));
  const hasChartsData = gamesCount > 0 || tournamentWinsCount > 0;

  return (
    <Grid className="cb-bg-panel cb-rounded" py="lg">
      <Grid.Col span={{ base: 12, md: 3 }} my="lg">
        <Box ta="center" pl={{ base: 0, md: 'sm' }}>
          <Box mb={{ base: 'sm', sm: 'lg' }}>
            <img
              className="cb-profile-avatar"
              style={{ borderRadius: 'var(--mantine-radius-sm)' }}
              src={user.avatarUrl}
              alt={i18n.t('User avatar')}
            />
          </Box>
          <div>
            <h1 className="cb-heading" style={{ wordBreak: 'break-word', fontWeight: 700 }}>
              {user.name}
            </h1>
            <hr className="cb-border-color" />
            <h3 className="cb-heading">
              <span>{i18n.t('Lang')}:</span>
              <LanguageIcon
                lang={user.lang}
                style={{ marginLeft: '0.5rem', width: '30px', height: '30px' }}
              />
            </h3>
            <hr className="cb-border-color" />
            <Box ta="center">
              <Text mb="xs" size="sm" tt="uppercase" c="dimmed">
                {i18n.t('Clan')}
              </Text>
              {hasClan ? (
                <Text
                  component="span"
                  className="cb-heading"
                  fw={700}
                  style={{ wordBreak: 'break-word' }}
                >
                  {user.clanId ? (
                    <a
                      style={{ color: 'inherit', textDecoration: 'none' }}
                      href={`/clans/${user.clanId}`}
                    >
                      {user.clan}
                    </a>
                  ) : (
                    user.clan
                  )}
                </Text>
              ) : (
                <Text component="span" c="dimmed">
                  {i18n.t('No clan')}
                </Text>
              )}
            </Box>
            <hr className="cb-border-color" />
            <Text mb="sm" size="sm" ff="monospace" c="dimmed">
              {i18n.t('joined at %{date}', { date: userInsertedAt })}
            </Text>
            {user.githubName && (
              <Box component="h3" className="h1">
                <Anchor
                  title={i18n.t('Github account')}
                  c="dimmed"
                  href={`https://github.com/${user.githubName}`}
                  aria-label={i18n.t('Github account')}
                >
                  <span className="fab fa-github" />
                </Anchor>
              </Box>
            )}
            {visibleAchievements.length > 0 && (
              <>
                <Box component="hr" mt="sm" />
                <h3 className="cb-heading" style={{ wordBreak: 'break-word' }}>
                  {i18n.t('Achievements')}
                </h3>
                <Box className="cb-achievements-grid" mt="md">
                  {visibleAchievements.map((item) => (
                    <Achievement key={item.type} achievement={item} />
                  ))}
                </Box>
              </>
            )}
            {seasonResults.length > 0 && (
              <>
                <Box component="hr" mt="md" />
                <h3 className="cb-heading" style={{ wordBreak: 'break-word' }}>
                  {i18n.t('Seasons')}
                </h3>
                <Box mt="sm" ta="left">
                  {seasonResults.map((result) => (
                    <Box
                      key={result.seasonId}
                      className="cb-rounded"
                      mb="sm"
                      p="sm"
                      style={{
                        backgroundColor: getSeasonPlaceColor(result.place),
                        border: '1px solid rgba(47, 52, 64, 0.25)',
                      }}
                    >
                      <Box fw={700}>
                        <a
                          href={`/seasons/${result.seasonId}`}
                          style={{ color: '#2f3440', textDecoration: 'none' }}
                        >
                          {`${result.seasonName} ${result.seasonYear}`}
                        </a>
                      </Box>
                      <Text size="sm" style={{ color: '#2f3440' }}>
                        {i18n.t('Place: #%{place}', { place: result.place })}
                      </Text>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </div>
        </Box>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 9 }} my="lg">
        <Flex className="min-h-100" direction="column" pr={{ base: 0, md: 'sm' }}>
          <Tabs
            value={activeTab}
            onChange={(value) => setActiveTab(value ?? 'statistics')}
            style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}
          >
            <Tabs.List grow>
              <Tabs.Tab value="statistics" tt="uppercase" fw={700}>
                {i18n.t('Statistics')}
              </Tabs.Tab>
              <Tabs.Tab value="tournaments" tt="uppercase" fw={700}>
                {i18n.t('Tournaments')}
              </Tabs.Tab>
              <Tabs.Tab value="completedGames" tt="uppercase" fw={700}>
                {i18n.t('Completed games')}
              </Tabs.Tab>
            </Tabs.List>
            <Box
              className="basis-0"
              style={{
                flexGrow: 1,
                border: '1px solid var(--mantine-color-default-border)',
                borderTop: 0,
                borderBottomLeftRadius: 'var(--mantine-radius-md)',
                borderBottomRightRadius: 'var(--mantine-radius-md)',
              }}
            >
              <Tabs.Panel value="statistics" keepMounted>
                <Grid mt="xl" px="md" justify="center">
                  <Grid.Col span={{ base: 'auto', md: 3 }} ta="center">
                    <div className="h1 cb-stats-number">{user.rating}</div>
                    <p className="lead">{i18n.t('(Elo Rating)')}</p>
                  </Grid.Col>
                  {!user.isBot && (
                    <Grid.Col span={{ base: 'auto', md: 3 }} ta="center">
                      <div className="h1 cb-stats-number">{`#${user.rank}`}</div>
                      <p className="lead">{i18n.t('Place')}</p>
                    </Grid.Col>
                  )}
                  <Grid.Col span={{ base: 'auto', md: 3 }} ta="center">
                    <div className="h1 cb-stats-number">{user.points || 0}</div>
                    <p className="lead">{i18n.t('Points')}</p>
                  </Grid.Col>
                </Grid>
                {hasChartsData && (
                  <UserStatCharts gameStats={gameStats} tournamentStats={tournamentStats} />
                )}
                {rivalsStatus === 'loading' && (
                  <Grid mt="xl" px="md" justify="center">
                    <Grid.Col span={{ base: 12, lg: 10 }}>
                      <Text size="sm" ta="center" c="dimmed" mb="sm">
                        {i18n.t('Rivals')}
                      </Text>
                      <Loading small />
                    </Grid.Col>
                  </Grid>
                )}
                {rivalsStatus === 'loaded' && topRivals.length > 0 && (
                  <Grid mt="xl" px="md" justify="center">
                    <Grid.Col span={{ base: 12, lg: 10 }}>
                      <Text size="sm" ta="center" c="dimmed" mb="sm">
                        {i18n.t('Rivals')}
                      </Text>
                      <Flex wrap="wrap" justify="center">
                        {topRivals.map((rival) => (
                          <Anchor
                            key={rival.id}
                            href={`/users/${rival.id}`}
                            className="cb-rounded"
                            display="block"
                            td="none"
                            m="xs"
                            px="md"
                            py="sm"
                            fw={700}
                            style={{
                              backgroundColor: '#c2c9d6',
                              border: '1px solid #a4aab3',
                              color: '#2f3440',
                              minWidth: '180px',
                              textAlign: 'center',
                            }}
                          >
                            <div>{rival.name}</div>
                            <Text size="sm">
                              {i18n.t('Clan: %{clan}', { clan: rival.clan || '-' })}
                            </Text>
                            <Text size="sm">
                              {i18n.t('W/L/T: %{wins}/%{losses}/%{timeouts}', {
                                wins: rival.winsCount,
                                losses: rival.lossesCount,
                                timeouts: rival.timeoutsCount,
                              })}
                            </Text>
                          </Anchor>
                        ))}
                      </Flex>
                    </Grid.Col>
                  </Grid>
                )}
                {languageGamesCount > 0 && (
                  <Grid mt="xl" px="md" justify="center">
                    <Grid.Col span={{ base: 12, lg: 10 }}>
                      <Text size="sm" ta="center" c="dimmed" mb="sm">
                        {i18n.t('Languages')}
                      </Text>
                      <Flex wrap="wrap" justify="center">
                        {languageEntries.map(([lang, count]) => (
                          <Box
                            key={lang}
                            className="cb-rounded"
                            m="xs"
                            px="md"
                            py="sm"
                            fw={700}
                            style={{
                              backgroundColor: '#c2c9d6',
                              border: '1px solid #a4aab3',
                              color: '#2f3440',
                              minWidth: '88px',
                              textAlign: 'center',
                            }}
                          >
                            {`${lang} · ${count}`}
                          </Box>
                        ))}
                      </Flex>
                    </Grid.Col>
                  </Grid>
                )}
                <Grid mt="xl" mb={{ md: 'md', lg: 'lg' }}>
                  <Grid.Col span={12}>
                    <Text size="sm" ta="center" c="dimmed" mb="sm">
                      {i18n.t('Activity')}
                    </Text>
                    <Heatmap />
                  </Grid.Col>
                </Grid>
              </Tabs.Panel>
              <Tabs.Panel value="tournaments" className="min-h-100" keepMounted>
                <Flex h="100%" direction="column" justify="center">
                  <UserTournaments isActive={activeTab === 'tournaments'} />
                </Flex>
              </Tabs.Panel>
              <Tabs.Panel value="completedGames" className="min-h-100" keepMounted>
                <Flex h="100%" direction="column" justify="center">
                  <CompletedGames className="h-100" />
                </Flex>
              </Tabs.Panel>
            </Box>
          </Tabs>
        </Flex>
      </Grid.Col>
    </Grid>
  );
}

export default UserProfile;
