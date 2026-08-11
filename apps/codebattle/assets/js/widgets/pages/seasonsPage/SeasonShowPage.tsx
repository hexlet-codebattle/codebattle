import React, { memo, useState, useMemo } from 'react';

import { Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { Avatar, Badge, Box, Button, Flex, Group, Paper, Text, Title } from '@mantine/core';
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

type SeasonResult = LeaderboardResult;

export interface Season {
  id: number | string;
  name: string;
  year: number | string;
  starts_at?: string;
  ends_at?: string;
  [key: string]: unknown;
}

export interface SeasonShowPageProps {
  season: Season | null;
  results: SeasonResult[];
}

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

interface PodiumCardProps {
  result: SeasonResult;
  isFirst?: boolean;
}

function PodiumCard({ result, isFirst = false }: PodiumCardProps) {
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
        <Text component="h4" c="white" mb="sm" fw={isFirst ? 700 : 500}>
          {result.user_name}
        </Text>
        <Group justify="center" gap="xs" mb="md">
          {result.user_lang && (
            <LanguageIcon lang={result.user_lang} style={{ width: '20px', height: '20px' }} />
          )}
          {result.clan_name && <Text c="dimmed">{result.clan_name}</Text>}
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
  top3?: SeasonResult[];
}

function ChampionsPodium({ top3 }: ChampionsPodiumProps) {
  if (!top3 || top3.length === 0) return null;

  const first = top3.find((r) => r.place === 1);
  const second = top3.find((r) => r.place === 2);
  const third = top3.find((r) => r.place === 3);

  return (
    <Box mb="xl">
      <Title order={2} className="text-gold" mb="lg" ta="center">
        {i18n.t('Champions')}
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

function SeasonShowPage({ season, results: initialResults }: SeasonShowPageProps) {
  // Memoize results to ensure stable reference
  const results = useMemo<SeasonResult[]>(() => initialResults, [initialResults]);

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<SeasonResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Use shared leaderboard state hook
  const leaderboardState = useLeaderboardState(results);

  const handleShowInsights = (player: SeasonResult) => {
    setSelectedPlayer(player);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlayer(null);
  };

  if (!season) {
    return (
      <Box className="cb-bg-panel cb-text" mih="100vh" py="xl">
        <Box w="100%" maw={1140} mx="auto" px="md">
          <Paper radius="md" shadow="sm" className="cb-bg-panel cb-rounded">
            <Box ta="center" py="xl">
              <Text c="dimmed">{i18n.t('Season not found')}</Text>
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  const top3 = results.slice(0, 3);

  // Determine season status
  const now = new Date();
  const startsAt = season.starts_at ? new Date(season.starts_at) : null;
  const endsAt = season.ends_at ? new Date(season.ends_at) : null;

  let seasonStatus: 'active' | 'upcoming' | 'completed' = 'active';
  if (startsAt && now < startsAt) {
    seasonStatus = 'upcoming';
  } else if (endsAt && now > endsAt) {
    seasonStatus = 'completed';
  }

  const statusBadgeColor = {
    upcoming: 'cyan',
    active: 'green',
    completed: 'gray',
  }[seasonStatus];

  const statusBadgeText = {
    upcoming: i18n.t('Upcoming'),
    active: i18n.t('Active'),
    completed: i18n.t('Completed'),
  }[seasonStatus];

  return (
    <Box className="cb-bg-panel cb-text" mih="100vh" py="xl">
      <Box w="100%" maw={1140} mx="auto" px="md">
        {/* Header */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'flex-start', md: 'center' }}
          mb="xl"
        >
          <Box>
            <Flex align="center" mb="sm">
              <Title order={1} className="text-gold" mr="sm" fw={700}>
                {season.name} {season.year}
              </Title>
              <Badge color={statusBadgeColor}>{statusBadgeText}</Badge>
            </Flex>
            <Flex align="center" gap="xs" c="dimmed">
              <FontAwesomeIcon icon={faCalendar} />
              {season.starts_at}
              {' — '}
              {season.ends_at}
            </Flex>
          </Box>
          <Flex mt={{ base: 'md', md: 0 }}>
            <Button
              component={Link}
              href="/seasons"
              variant="outline"
              mr="sm"
              className="btn-outline-gold"
            >
              {i18n.t('All Seasons')}
            </Button>
            <Button
              component="a"
              href="/hall_of_fame"
              variant="outline"
              className="btn-outline-gold"
            >
              {i18n.t('Hall of Fame')}
            </Button>
          </Flex>
        </Flex>

        {/* Champions Podium */}
        <ChampionsPodium top3={top3} />

        {/* Full Leaderboard */}
        <Paper radius="md" shadow="sm" className="cb-bg-panel cb-rounded">
          <Flex
            justify="space-between"
            align="center"
            px="md"
            py="md"
            style={{ borderBottom: '1px solid #6c757d' }}
          >
            <Title order={2} className="text-gold">
              {i18n.t('Full Leaderboard')}
            </Title>
            <Badge color="gray">{i18n.t('%{count} players', { count: results.length })}</Badge>
          </Flex>
          <Box>
            <LeaderboardTable
              results={results}
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

        {/* Player Insights Modal */}
        <PlayerInsightsModal
          show={showModal}
          onHide={handleCloseModal}
          player={selectedPlayer}
          allResults={results}
          season={
            season as {
              id: number;
              name?: string;
              year?: number | string;
            } | null
          }
        />
      </Box>
    </Box>
  );
}

export default memo(SeasonShowPage);
