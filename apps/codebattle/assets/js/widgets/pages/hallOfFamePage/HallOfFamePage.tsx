import React, { memo, useMemo, useState } from 'react';

import { Link } from '@inertiajs/react';
import { Avatar, Badge, Box, Button, Flex, Grid, Group, Paper, Text, Title } from '@mantine/core';
import cn from 'classnames';

import i18n from '../../../i18n';
import LanguageIcon from '../../components/LanguageIcon';
import PlayerInsightsModal from '../../components/PlayerInsightsModal';
import {
  LeaderboardTable,
  useLeaderboardState,
  getMedalEmoji,
  type LeaderboardResult,
} from '../../components/SeasonLeaderboard';
import UserInfo from '../../components/UserInfo';

type HofResult = LeaderboardResult;
// Season payload is a snake_case Inertia prop with a backend-defined shape;
// typed loosely per migration conventions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HofSeason = Record<string, any> & { id: number };

export interface PreviousSeasonWinnersEntry {
  season: HofSeason;
  winners: HofResult[];
}

export interface HallOfFamePageProps {
  currentSeason: HofSeason | null;
  currentSeasonResults: HofResult[];
  previousSeasonsWinners: PreviousSeasonWinnersEntry[];
}

// Mantine `<Badge>` color for a leaderboard place (gold / silver / bronze /
// default). Mirrors the removed Bootstrap `getPlaceBadgeClass` helper, but as
// Mantine colors instead of BS bg classes (same map as `PlayerInsightsModal`).
const placeBadgeColor = (place?: number) => {
  switch (place) {
    case 1:
      return 'yellow';
    case 2:
      return 'gray';
    case 3:
      return '#cd7f32';
    default:
      return 'blue';
  }
};

interface StatBoxProps {
  label: React.ReactNode;
  value: React.ReactNode;
  highlight?: boolean;
}

function StatBox({ label, value, highlight = false }: StatBoxProps) {
  return (
    <Box ta="center">
      <Text fw={700} c={highlight ? 'yellow' : 'white'}>
        {value}
      </Text>
      <Text size="xs" c="dimmed" tt="uppercase">
        {label}
      </Text>
    </Box>
  );
}

const truncateText = (text?: string, maxLength = 12) =>
  text && text.length > maxLength ? text.slice(0, maxLength) : text;

interface PodiumCardProps {
  result: HofResult;
  isFirst?: boolean;
}

function PodiumCard({ result, isFirst = false }: PodiumCardProps) {
  const displayName = truncateText(result.user_name);
  const displayClan = truncateText(result.clan_name);
  const user = {
    id: result.user_id,
    name: result.user_name,
    lang: result.user_lang,
    avatarUrl: result.avatar_url,
    clan: result.clan_name,
    points: result.total_points,
    rank: result.place,
  };

  return (
    <Paper
      h="100%"
      radius="sm"
      shadow="lg"
      className={cn('cb-hof-podium-card', {
        'cb-gold-place-bg': result.place === 1,
        'cb-silver-place-bg': result.place === 2,
        'cb-bronze-place-bg': result.place === 3,
      })}
    >
      <Flex
        direction="column"
        align="center"
        justify="center"
        ta="center"
        flex={1}
        px="md"
        py={isFirst ? 'lg' : 'md'}
      >
        <Box mb="sm">{getMedalEmoji(result.place)}</Box>
        {result.avatar_url && (
          <Avatar
            src={result.avatar_url}
            alt={result.user_name}
            size={isFirst ? 64 : 48}
            radius="50%"
            mb="sm"
          />
        )}
        <Flex justify="center" mb="sm">
          <UserInfo
            user={user}
            lang={undefined}
            hideOnlineIndicator
            hideRank
            displayName={displayName}
          />
        </Flex>
        <Group justify="center" gap="xs" mb="md">
          {result.user_lang && (
            <LanguageIcon lang={result.user_lang} style={{ width: '20px', height: '20px' }} />
          )}
          {result.clan_name && <Text c="dimmed">{displayClan}</Text>}
        </Group>
        <Flex justify="center" mt={isFirst ? 'lg' : 'md'}>
          <Box px="md">
            <StatBox label={i18n.t('Points')} value={result.total_points} highlight={isFirst} />
          </Box>
          <Box px="md">
            <StatBox label={i18n.t('Wins')} value={result.total_wins_count} />
          </Box>
        </Flex>
        <Flex justify="center" mt="md">
          <Box px="md">
            <StatBox label={i18n.t('Score')} value={result.total_score} />
          </Box>
          <Box px="md">
            <StatBox label={i18n.t('Tournaments')} value={result.tournaments_count} />
          </Box>
        </Flex>
      </Flex>
    </Paper>
  );
}

interface ChampionsPodiumProps {
  top3: HofResult[];
}

function ChampionsPodium({ top3 }: ChampionsPodiumProps) {
  if (!top3 || top3.length === 0) return null;

  const first = top3.find((r) => r.place === 1);
  const second = top3.find((r) => r.place === 2);
  const third = top3.find((r) => r.place === 3);

  return (
    <Box mb="xl">
      <Title order={2} className="text-gold" mb="lg" ta="center">
        {i18n.t('Top 3')}
      </Title>
      <Flex wrap="wrap" align="flex-end" justify="center">
        {/* Second place - left */}
        <Box w={{ base: '100%', md: '33.3333%', lg: '25%' }} px="md">
          {second && (
            <Box style={{ marginTop: '2rem' }}>
              <PodiumCard result={second} />
            </Box>
          )}
        </Box>

        {/* First place - center, elevated */}
        <Box w={{ base: '100%', md: '33.3333%', lg: '25%' }} px="md">
          {first && <PodiumCard result={first} isFirst />}
        </Box>

        {/* Third place - right */}
        <Box w={{ base: '100%', md: '33.3333%', lg: '25%' }} px="md">
          {third && (
            <Box style={{ marginTop: '3rem' }}>
              <PodiumCard result={third} />
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  );
}

interface PreviousSeasonWinnersProps {
  previousSeasonsWinners: PreviousSeasonWinnersEntry[];
}

function PreviousSeasonWinners({ previousSeasonsWinners }: PreviousSeasonWinnersProps) {
  if (!previousSeasonsWinners || previousSeasonsWinners.length === 0) return null;

  return (
    <Box mt="xl">
      <Flex justify="space-between" align="center" mb="lg">
        <Title order={2} className="text-gold">
          {i18n.t('Previous Seasons Champions')}
        </Title>
        <Button
          component="a"
          href="/seasons"
          variant="outline"
          size="compact-sm"
          className="btn-outline-gold"
        >
          {i18n.t('View All Seasons')}
        </Button>
      </Flex>

      {previousSeasonsWinners.map(({ season, winners }) => (
        <Paper
          key={season.id}
          radius="md"
          shadow="lg"
          mb="md"
          className="cb-bg-panel cb-rounded"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
          }}
        >
          <Box p="md">
            <Flex justify="space-between" align="center" mb="md">
              <Title order={4} c="yellow">
                {season.name} {season.year}
              </Title>
              <Button
                component="a"
                href={`/seasons/${season.id}`}
                variant="outline"
                size="compact-sm"
                className="btn-outline-gold"
              >
                {i18n.t('Full Results')}
              </Button>
            </Flex>

            <Grid>
              {winners.map((winner) => {
                const displayName = truncateText(winner.user_name);
                const displayClan = truncateText(winner.clan_name);
                const user = {
                  id: winner.user_id,
                  name: winner.user_name,
                  lang: winner.user_lang,
                  avatarUrl: winner.avatar_url,
                  clan: winner.clan_name,
                  points: winner.total_points,
                  rank: winner.place,
                };

                return (
                  <Grid.Col key={winner.user_id} span={{ base: 12, md: 4 }}>
                    <Paper
                      h="100%"
                      radius="sm"
                      className={cn('cb-hof-podium-card', {
                        'cb-gold-place-bg': winner.place === 1,
                        'cb-silver-place-bg': winner.place === 2,
                        'cb-bronze-place-bg': winner.place === 3,
                      })}
                    >
                      <Box p="md">
                        <Flex align="center" mb="sm">
                          <Badge color={placeBadgeColor(winner.place)} mr="xs">
                            {getMedalEmoji(winner.place)}
                          </Badge>
                          {winner.avatar_url && (
                            <Avatar
                              src={winner.avatar_url}
                              alt={winner.user_name}
                              size={32}
                              radius="50%"
                              mr="xs"
                            />
                          )}
                          <UserInfo
                            user={user}
                            lang={undefined}
                            hideOnlineIndicator
                            hideRank
                            displayName={displayName}
                          />
                        </Flex>
                        <Box>
                          <Flex align="center" gap="xs" mb={4}>
                            {winner.user_lang && (
                              <LanguageIcon
                                lang={winner.user_lang}
                                style={{ width: '16px', height: '16px' }}
                              />
                            )}
                            {winner.clan_name && (
                              <Text c="dimmed" title={winner.clan_name}>
                                {displayClan}
                              </Text>
                            )}
                          </Flex>
                          <Flex justify="space-between">
                            <Text c="dimmed">{i18n.t('Points')}:</Text>
                            <Text c="white" fw={700}>
                              {winner.total_points}
                            </Text>
                          </Flex>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid.Col>
                );
              })}
            </Grid>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

function HallOfFamePage({
  currentSeason,
  currentSeasonResults: initialCurrentSeasonResults,
  previousSeasonsWinners,
}: HallOfFamePageProps) {
  const currentSeasonResults = useMemo(
    () => initialCurrentSeasonResults,
    [initialCurrentSeasonResults],
  );

  // Use the shared leaderboard state hook
  const leaderboardState = useLeaderboardState(currentSeasonResults);

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<HofResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleShowInsights = (player: HofResult) => {
    setSelectedPlayer(player);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlayer(null);
  };

  const top3 = currentSeasonResults.slice(0, 3);

  return (
    <Box className="cb-bg-panel cb-text" mih="100vh" py="xl">
      <Box w="100%" maw={1140} mx="auto" px="md">
        <Title order={1} className="text-gold" ta="center" mb="xl" fw={700}>
          {i18n.t('Hall of Fame')}
        </Title>

        {currentSeason && (
          <>
            <Paper radius="md" shadow="sm" mb="md" className="cb-bg-panel cb-rounded">
              <Box px="md" py="md">
                <Flex justify="space-between" align="center">
                  <Box>
                    <Title order={5} className="text-gold" mb="sm">
                      {currentSeason.name} {currentSeason.year}
                    </Title>
                    <Flex wrap="wrap" gap="md">
                      <Text size="xs" c="dimmed">
                        <strong>{i18n.t('Starts')}:</strong> {currentSeason.starts_at}
                      </Text>
                      <Text size="xs" c="dimmed">
                        <strong>{i18n.t('Ends')}:</strong> {currentSeason.ends_at}
                      </Text>
                    </Flex>
                  </Box>
                  <Button
                    component={Link}
                    href="/seasons"
                    variant="outline"
                    className="btn-outline-gold"
                  >
                    {i18n.t('View All Seasons')}
                  </Button>
                </Flex>
              </Box>
            </Paper>

            <ChampionsPodium top3={top3} />

            {currentSeasonResults.length > 0 && (
              <Paper radius="md" shadow="sm" className="cb-bg-panel cb-rounded">
                <Flex
                  justify="space-between"
                  align="center"
                  px="md"
                  py="md"
                  style={{ borderBottom: '1px solid #6c757d' }}
                >
                  <Title order={2} className="text-gold">
                    {i18n.t('Current Season Leaderboard')}
                  </Title>
                  <Badge color="gray">
                    {i18n.t('%{count} players', { count: currentSeasonResults.length })}
                  </Badge>
                </Flex>
                <Box>
                  <LeaderboardTable
                    results={currentSeasonResults}
                    onShowInsights={handleShowInsights}
                    searchQuery={leaderboardState.searchQuery}
                    onSearchChange={leaderboardState.handleSearchChange}
                    clanFilter={leaderboardState.clanFilter}
                    onClanFilterChange={leaderboardState.handleClanFilterChange}
                    langFilter={leaderboardState.langFilter}
                    onLangFilterChange={leaderboardState.handleLangFilterChange}
                    uniqueClans={leaderboardState.uniqueClans as string[]}
                    uniqueLangs={leaderboardState.uniqueLangs as string[]}
                    onResetFilters={leaderboardState.handleResetFilters}
                    sortConfig={leaderboardState.sortConfig}
                    onSort={leaderboardState.handleSort}
                    currentPage={leaderboardState.currentPage}
                    totalPages={leaderboardState.totalPages}
                    onPageChange={leaderboardState.handlePageChange}
                    totalItems={leaderboardState.sortedResults.length}
                    itemsPerPage={leaderboardState.itemsPerPage}
                    onItemsPerPageChange={leaderboardState.handleItemsPerPageChange}
                    displayedResults={leaderboardState.displayedResults}
                    showInsightsButton
                  />
                </Box>
              </Paper>
            )}

            {/* Player Insights Modal */}
            <PlayerInsightsModal
              show={showModal}
              onHide={handleCloseModal}
              player={selectedPlayer as React.ComponentProps<typeof PlayerInsightsModal>['player']}
              allResults={currentSeasonResults}
              season={currentSeason}
            />
          </>
        )}

        <PreviousSeasonWinners previousSeasonsWinners={previousSeasonsWinners} />
      </Box>
    </Box>
  );
}

export default memo(HallOfFamePage);
