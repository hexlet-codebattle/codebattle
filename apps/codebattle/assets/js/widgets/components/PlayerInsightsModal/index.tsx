import React, { useState, useMemo, useEffect } from 'react';

import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Table,
  Text,
} from '@mantine/core';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
} from 'recharts';

import Modal from '@/components/CbModal';

import i18n from '../../../i18n';
import LanguageIcon from '../LanguageIcon';
import {
  GRADE_COLORS,
  ALL_GRADES,
  getMedalEmoji,
  formatTime,
  formatGradeName,
  formatDate,
  type LeaderboardResult,
} from '../SeasonLeaderboard';

// Mantine `<Badge>` color for a leaderboard place (gold / silver / bronze /
// default). Mirrors the Bootstrap `getPlaceBadgeClass` still used by the not-yet
// converted HallOfFamePage, but as Mantine colors instead of BS bg classes.
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

// Shared section heading used across the modal (was `h6.text-muted.text-uppercase`).
function SectionHeading({ children, size = 'sm' }: { children: React.ReactNode; size?: string }) {
  return (
    <Text size={size} c="dimmed" tt="uppercase" fw={600} mb="md">
      {children}
    </Text>
  );
}

interface GradeStat {
  grade: string;
  total_points?: number;
  total_wins?: number;
  total_games?: number;
  tournaments_count?: number;
  best_place?: number;
  avg_place?: number;
  podium_finishes?: number[];
}

interface TournamentResult {
  tournament_id: number;
  tournament_name?: string;
  started_at?: string;
  grade: string;
  place: number;
  total_participants: number;
  points: number;
  wins_count: number;
  games_count: number;
}

interface PerformanceTrendPoint {
  week: string;
  total_points: number;
  total_wins: number;
  tournaments_count: number;
}

interface DetailedStats {
  grade_stats?: GradeStat[];
  recent_tournaments?: TournamentResult[];
  performance_trend?: PerformanceTrendPoint[];
}

interface MedianStats {
  points: number;
  wins: number;
  games: number;
  tournaments: number;
  score: number;
  winRate: number;
}

interface Season {
  id: number;
  name?: string;
  year?: number | string;
}

interface Player extends LeaderboardResult {
  clan_name?: string;
}

// Grade Stats Chart Component - now shows all grades
function GradeStatsChart({ gradeStats }: { gradeStats?: GradeStat[] }) {
  // Create a map of existing grade stats
  const gradeStatsMap = useMemo(() => {
    const map: Record<string, GradeStat> = {};
    if (gradeStats) {
      gradeStats.forEach((g) => {
        map[g.grade] = g;
      });
    }
    return map;
  }, [gradeStats]);

  // Build chart data with all grades (even those with 0 points)
  const chartData = ALL_GRADES.map((grade) => ({
    name: formatGradeName(grade),
    points: gradeStatsMap[grade]?.total_points || 0,
    tournaments: gradeStatsMap[grade]?.tournaments_count || 0,
    wins: gradeStatsMap[grade]?.total_wins || 0,
    fill: GRADE_COLORS[grade] || '#666',
  }));

  return (
    <Box mb="lg">
      <SectionHeading>{i18n.t('Points by Tournament Grade')}</SectionHeading>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis type="number" stroke="#999" />
          <YAxis type="category" dataKey="name" stroke="#999" width={100} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
            labelStyle={{ color: '#fff' }}
          />
          <Bar dataKey="points" name={i18n.t('Points')}>
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

// Win Rate Donut Chart
function WinRateChart({ wins, total }: { wins: number; total: number }) {
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const data = [
    { name: i18n.t('Wins'), value: wins, fill: '#198754' },
    { name: i18n.t('Losses'), value: total - wins, fill: '#2d2d2d' },
  ];

  return (
    <Box ta="center">
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
        </PieChart>
      </ResponsiveContainer>
      <Box style={{ marginTop: '-40px', position: 'relative' }}>
        <Text fz="1.5rem" fw={700} c="green">
          {winRate}%
        </Text>
        <Text c="dimmed" size="sm">
          {i18n.t('Win Rate')}
        </Text>
      </Box>
    </Box>
  );
}

// Performance Trend Chart
function PerformanceTrendChart({ trend }: { trend?: PerformanceTrendPoint[] }) {
  if (!trend || trend.length === 0) return null;

  const chartData = trend.map((t) => ({
    week: formatDate(t.week),
    points: t.total_points,
    wins: t.total_wins,
    tournaments: t.tournaments_count,
  }));

  return (
    <Box mb="lg">
      <SectionHeading>{i18n.t('Weekly Performance Trend')}</SectionHeading>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="week" stroke="#999" />
          <YAxis stroke="#999" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="points"
            name={i18n.t('Points')}
            stroke="#0dcaf0"
            fill="#0dcaf0"
            fillOpacity={0.3}
          />
          <Area
            type="monotone"
            dataKey="wins"
            name={i18n.t('Wins')}
            stroke="#198754"
            fill="#198754"
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

// Grade Stats Table
function GradeStatsTable({ gradeStats }: { gradeStats?: GradeStat[] }) {
  if (!gradeStats || gradeStats.length === 0) {
    return (
      <Box ta="center" c="dimmed" py="md">
        {i18n.t('No tournament data by grade available')}
      </Box>
    );
  }

  return (
    <Table.ScrollContainer minWidth={520}>
      <Table verticalSpacing="xs" mb={0}>
        <Table.Thead>
          <Table.Tr c="dimmed" fz="sm">
            <Table.Th>{i18n.t('Grade')}</Table.Th>
            <Table.Th ta="center">{i18n.t('Tournaments')}</Table.Th>
            <Table.Th ta="center">{i18n.t('Points')}</Table.Th>
            <Table.Th ta="center">{i18n.t('Wins')}</Table.Th>
            <Table.Th ta="center">{i18n.t('Best')}</Table.Th>
            <Table.Th ta="center">{i18n.t('Avg')}</Table.Th>
            <Table.Th ta="center">{i18n.t('Podiums')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {gradeStats.map((g) => (
            <Table.Tr key={g.grade}>
              <Table.Td>
                <Text component="span" fw={700} style={{ color: GRADE_COLORS[g.grade] || '#666' }}>
                  {formatGradeName(g.grade)}
                </Text>
              </Table.Td>
              <Table.Td ta="center">{g.tournaments_count}</Table.Td>
              <Table.Td ta="center" fw={700} c="yellow">
                {g.total_points}
              </Table.Td>
              <Table.Td ta="center" c="green">
                {g.total_wins}
              </Table.Td>
              <Table.Td ta="center">
                {g.best_place ? (
                  <Badge size="sm" color={placeBadgeColor(g.best_place)}>
                    {g.best_place}
                  </Badge>
                ) : (
                  '-'
                )}
              </Table.Td>
              <Table.Td ta="center">{g.avg_place?.toFixed(1) || '-'}</Table.Td>
              <Table.Td ta="center">
                {g.podium_finishes && g.podium_finishes.length > 0
                  ? g.podium_finishes.map((p) => getMedalEmoji(p)).join('')
                  : '-'}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

// Tournaments Table (no scroll limit)
function TournamentsTable({ tournaments }: { tournaments?: TournamentResult[] }) {
  if (!tournaments || tournaments.length === 0) {
    return (
      <Box ta="center" c="dimmed" py="md">
        {i18n.t('No tournament data available')}
      </Box>
    );
  }

  return (
    <Table.ScrollContainer minWidth={520}>
      <Table verticalSpacing="xs" highlightOnHover mb={0}>
        <Table.Thead>
          <Table.Tr c="dimmed" fz="sm">
            <Table.Th>{i18n.t('Tournament')}</Table.Th>
            <Table.Th ta="center">{i18n.t('Grade')}</Table.Th>
            <Table.Th ta="center">{i18n.t('Place')}</Table.Th>
            <Table.Th ta="center">{i18n.t('Points')}</Table.Th>
            <Table.Th ta="center">{i18n.t('W/G')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tournaments.map((t) => (
            <Table.Tr key={t.tournament_id}>
              <Table.Td>
                <Anchor href={`/tournaments/${t.tournament_id}`} c="gray.4" underline="never">
                  {t.tournament_name || i18n.t('Tournament #%{id}', { id: t.tournament_id })}
                  <Text component="span" c="dimmed" fz="xs" ml="sm">
                    {formatDate(t.started_at)}
                  </Text>
                </Anchor>
              </Table.Td>
              <Table.Td ta="center">
                <Text component="span" fw={700} style={{ color: GRADE_COLORS[t.grade] || '#666' }}>
                  {formatGradeName(t.grade)}
                </Text>
              </Table.Td>
              <Table.Td ta="center">
                <Badge size="sm" color={placeBadgeColor(t.place)}>
                  {t.place <= 3 ? getMedalEmoji(t.place) : `#${t.place}`}
                </Badge>
                <Text component="span" c="dimmed" fz="xs" ml={4}>
                  /{t.total_participants}
                </Text>
              </Table.Td>
              <Table.Td ta="center" fw={700} c="yellow">
                {t.points}
              </Table.Td>
              <Table.Td ta="center">
                <Text component="span" c="green">
                  {t.wins_count}
                </Text>
                /{t.games_count}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

interface PlayerInsightsModalProps {
  show: boolean;
  onHide: () => void;
  player?: Player | null;
  allResults: LeaderboardResult[];
  season?: Season | null;
}

interface StatRowProps {
  label: string;
  children: React.ReactNode;
}

// One row of the overview stats list (was `d-flex justify-content-between mb-2`).
function StatRow({ label, children }: StatRowProps) {
  return (
    <Group justify="space-between" mb="sm">
      <Text c="dimmed">{label}</Text>
      {children}
    </Group>
  );
}

// Player Insights Modal with API loading
function PlayerInsightsModal({
  show,
  onHide,
  player,
  allResults,
  season,
}: PlayerInsightsModalProps) {
  const [loading, setLoading] = useState(false);
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch detailed stats when modal opens
  useEffect(() => {
    if (show && player && season) {
      setLoading(true);
      setError(null);

      fetch(`/api/v1/seasons/${season.id}/players/${player.user_id}/stats`)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }

          const data = await response.json();
          setDetailedStats(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch player stats:', err);
          setError(i18n.t('Failed to load detailed stats'));
          setLoading(false);
        });
    }
  }, [show, player, season]);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setDetailedStats(null);
      setActiveTab('overview');
    }
  }, [show]);

  // Calculate median stats from all results for comparison
  const medianStats = useMemo<MedianStats | null>(() => {
    if (!allResults || allResults.length === 0) return null;

    const sortedPoints = [...allResults].sort((a, b) => a.total_points - b.total_points);
    const sortedWins = [...allResults].sort((a, b) => a.total_wins_count - b.total_wins_count);
    const sortedGames = [...allResults].sort((a, b) => a.total_games_count - b.total_games_count);
    const sortedTournaments = [...allResults].sort(
      (a, b) => a.tournaments_count - b.tournaments_count,
    );
    const sortedScore = [...allResults].sort((a, b) => a.total_score - b.total_score);

    const mid = Math.floor(allResults.length / 2);
    const getMedian = (arr: number[]) =>
      arr.length % 2 === 0 ? Math.round((arr[mid - 1] + arr[mid]) / 2) : arr[mid];

    const winRates = allResults
      .filter((r) => r.total_games_count > 0)
      .map((r) => (r.total_wins_count / r.total_games_count) * 100)
      .sort((a, b) => a - b);
    const winRateMid = Math.floor(winRates.length / 2);

    return {
      points: getMedian(sortedPoints.map((r) => r.total_points)),
      wins: getMedian(sortedWins.map((r) => r.total_wins_count)),
      games: getMedian(sortedGames.map((r) => r.total_games_count)),
      tournaments: getMedian(sortedTournaments.map((r) => r.tournaments_count)),
      score: getMedian(sortedScore.map((r) => r.total_score)),
      winRate: (() => {
        if (winRates.length === 0) return 0;
        if (winRates.length % 2 === 0) {
          return (winRates[winRateMid - 1] + winRates[winRateMid]) / 2;
        }
        return winRates[winRateMid];
      })(),
    };
  }, [allResults]);

  if (!player) return null;

  // Calculate derived statistics from allResults (basic stats)
  const totalPlayers = allResults.length;
  const percentile =
    totalPlayers > 0 ? Math.round(((totalPlayers - player.place) / totalPlayers) * 100) : 0;

  // Get grade wins from detailed stats
  const getGradeWins = (): Record<string, number> => {
    if (!detailedStats?.grade_stats) return {};
    const wins: Record<string, number> = {};
    detailedStats.grade_stats.forEach((g) => {
      wins[g.grade] = g.tournaments_count || 0;
    });
    return wins;
  };

  const gradeWins = getGradeWins();
  const playerWinRate =
    player.total_games_count > 0
      ? Math.round((player.total_wins_count / player.total_games_count) * 100)
      : 0;

  return (
    <Modal show={show} onHide={onHide} size="90%" centered>
      <Modal.Header
        closeButton
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <Box w="100%">
          <Group align="center" justify="space-between" wrap="nowrap">
            {/* Left: Rank + Avatar + Name */}
            <Group align="center" wrap="nowrap">
              <Box ta="center" miw={60}>
                <Badge size="xl" color={placeBadgeColor(player.place)}>
                  {getMedalEmoji(player.place) || `#${player.place}`}
                </Badge>
              </Box>
              {player.avatar_url && (
                <Avatar src={player.avatar_url} alt={player.user_name} size={48} radius="md" />
              )}
              <Box>
                <Text fz="1.5rem" fw={700} c="white">
                  {player.user_name}
                </Text>
                <Text c="dimmed" size="sm">
                  {season?.name} {season?.year}
                  {player.clan_name && (
                    <Text component="span" c="cyan" ml="sm">
                      {player.clan_name}
                    </Text>
                  )}
                </Text>
              </Box>
            </Group>

            {/* Right: Quick Stats */}
            <Group mr="xl" gap="xl" wrap="nowrap">
              <Box ta="center">
                <Text fz="1.5rem" fw={700} c="yellow">
                  {player.total_points.toLocaleString()}
                </Text>
                <Text c="dimmed" size="sm" tt="uppercase">
                  {i18n.t('Points')}
                </Text>
              </Box>
              <Box ta="center">
                <Text fz="1.5rem" fw={700} c="green">
                  {player.total_wins_count}
                </Text>
                <Text c="dimmed" size="sm" tt="uppercase">
                  {i18n.t('Wins')}
                </Text>
              </Box>
              <Box ta="center">
                <Text fz="1.5rem" fw={700} c="cyan">
                  {player.tournaments_count}
                </Text>
                <Text c="dimmed" size="sm" tt="uppercase">
                  {i18n.t('Tournaments')}
                </Text>
              </Box>
            </Group>
          </Group>
        </Box>
      </Modal.Header>

      <Modal.Body style={{ padding: 0, maxHeight: '75vh', overflowY: 'auto' }}>
        {/* Tabs */}
        <Group
          justify="center"
          gap="sm"
          p="md"
          pos="sticky"
          top={0}
          bg="dark.7"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)', zIndex: 2 }}
        >
          {[
            ['overview', i18n.t('Overview')],
            ['grades', i18n.t('By Grade')],
            ['tournaments', i18n.t('Tournaments')],
            ['trends', i18n.t('Trends')],
          ].map(([key, label]) => (
            <Button
              key={key}
              size="xs"
              color="cyan"
              variant={activeTab === key ? 'filled' : 'default'}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </Button>
          ))}
        </Group>

        {/* Loading State */}
        {loading && (
          <Box ta="center" py="xl">
            <Loader color="blue" />
            <Text c="dimmed" mt="sm">
              {i18n.t('Loading detailed stats...')}
            </Text>
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert color="yellow" m="md">
            {error}. {i18n.t('Showing basic stats only.')}
          </Alert>
        )}

        {/* Tab Content */}
        {!loading && (
          <Box p="md">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <Grid>
                {/* Left Column - Weapon + Stats */}
                <Grid.Col span={{ base: 12, md: 5 }}>
                  {/* Weapon Section */}
                  {player.user_lang && (
                    <Box mb="lg" ta="center">
                      <SectionHeading>{i18n.t('Weapon')}</SectionHeading>
                      <LanguageIcon
                        lang={player.user_lang}
                        style={{ width: '80px', height: '80px' }}
                      />
                      <Text fz="1.25rem" c="white" tt="capitalize" mt="sm">
                        {player.user_lang}
                      </Text>
                    </Box>
                  )}

                  {/* Stats List */}
                  <Box>
                    <StatRow label={i18n.t('Season Rank')}>
                      <Text fw={700} c="yellow">
                        #{player.place}{' '}
                        <Text component="span" c="dimmed" fz="sm">
                          {i18n.t('/ Top %{percent}%', { percent: 100 - percentile })}
                        </Text>
                      </Text>
                    </StatRow>
                    <StatRow label={i18n.t('Total Points')}>
                      <Text fw={700} c="yellow">
                        {player.total_points.toLocaleString()}
                      </Text>
                    </StatRow>
                    <StatRow label={i18n.t('Total Score')}>
                      <Text fw={700} c="cyan">
                        {player.total_score.toLocaleString()}
                      </Text>
                    </StatRow>
                    <StatRow label={i18n.t('Total Wins')}>
                      <Text fw={700} c="green">
                        {player.total_wins_count}
                      </Text>
                    </StatRow>
                    <StatRow label={i18n.t('Total Games')}>
                      <Text fw={700}>{player.total_games_count}</Text>
                    </StatRow>
                    <StatRow label={i18n.t('Tournaments')}>
                      <Text fw={700}>{player.tournaments_count}</Text>
                    </StatRow>
                    <StatRow label={i18n.t('Best Finish')}>
                      {player.best_place ? (
                        <Badge color={placeBadgeColor(player.best_place)}>
                          #{player.best_place}
                        </Badge>
                      ) : (
                        <Text component="span">-</Text>
                      )}
                    </StatRow>
                    <StatRow label={i18n.t('Avg Finish')}>
                      <Text fw={700}>
                        #{player.avg_place ? Number(player.avg_place).toFixed(1) : '-'}
                      </Text>
                    </StatRow>
                    <StatRow label={i18n.t('Time Played')}>
                      <Text fw={700}>{formatTime(player.total_time)}</Text>
                    </StatRow>
                  </Box>
                </Grid.Col>

                {/* Right Column - Win Rate + Grades + Comparison */}
                <Grid.Col span={{ base: 12, md: 7 }}>
                  {/* Win Rate Chart */}
                  <WinRateChart wins={player.total_wins_count} total={player.total_games_count} />

                  {/* Tournaments by Grade */}
                  <Card className="cb-bg-panel" p="md" radius="md" mb="md" mt="md">
                    <SectionHeading>{i18n.t('Tournaments by Grade')}</SectionHeading>
                    <Grid>
                      {ALL_GRADES.map((grade) => (
                        <Grid.Col key={grade} span={{ base: 6, md: 4 }}>
                          <Group align="center" gap="sm" wrap="nowrap">
                            <Text fw={700} style={{ color: GRADE_COLORS[grade], minWidth: '90px' }}>
                              {formatGradeName(grade)}
                            </Text>
                            <Text fw={700} c="white">
                              {gradeWins[grade] || 0}
                            </Text>
                          </Group>
                        </Grid.Col>
                      ))}
                    </Grid>
                  </Card>

                  {/* Quick comparison with median */}
                  {medianStats && (
                    <Card className="cb-bg-panel" p="md" radius="md">
                      <SectionHeading>{i18n.t('vs Median Player')}</SectionHeading>
                      <Grid fz="sm">
                        <Grid.Col span={6}>
                          <Text component="span" c="dimmed">
                            {i18n.t('Points:')}{' '}
                          </Text>
                          <Text
                            component="span"
                            fw={700}
                            c={player.total_points >= medianStats.points ? 'green' : 'red'}
                          >
                            {player.total_points >= medianStats.points ? '+' : ''}
                            {(player.total_points - medianStats.points).toLocaleString()}
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text component="span" c="dimmed">
                            {i18n.t('Win Rate:')}{' '}
                          </Text>
                          <Text
                            component="span"
                            fw={700}
                            c={playerWinRate >= medianStats.winRate ? 'green' : 'red'}
                          >
                            {playerWinRate >= medianStats.winRate ? '+' : ''}
                            {(playerWinRate - medianStats.winRate).toFixed(1)}%
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text component="span" c="dimmed">
                            {i18n.t('Wins:')}{' '}
                          </Text>
                          <Text
                            component="span"
                            fw={700}
                            c={player.total_wins_count >= medianStats.wins ? 'green' : 'red'}
                          >
                            {player.total_wins_count >= medianStats.wins ? '+' : ''}
                            {player.total_wins_count - medianStats.wins}
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text component="span" c="dimmed">
                            {i18n.t('Tournaments:')}{' '}
                          </Text>
                          <Text
                            component="span"
                            fw={700}
                            c={
                              player.tournaments_count >= medianStats.tournaments ? 'green' : 'red'
                            }
                          >
                            {player.tournaments_count >= medianStats.tournaments ? '+' : ''}
                            {player.tournaments_count - medianStats.tournaments}
                          </Text>
                        </Grid.Col>
                      </Grid>
                    </Card>
                  )}
                </Grid.Col>
              </Grid>
            )}

            {/* Grades Tab */}
            {activeTab === 'grades' && (
              <>
                <SectionHeading>{i18n.t('Tournament Performance by Grade')}</SectionHeading>
                {detailedStats?.grade_stats ? (
                  <>
                    <GradeStatsTable gradeStats={detailedStats.grade_stats} />
                    <Box mt="lg">
                      <GradeStatsChart gradeStats={detailedStats.grade_stats} />
                    </Box>
                  </>
                ) : (
                  <Box ta="center" c="dimmed" py="md">
                    {i18n.t(loading ? 'Loading...' : 'No grade stats available')}
                  </Box>
                )}
              </>
            )}

            {/* Tournaments Tab */}
            {activeTab === 'tournaments' && (
              <>
                <SectionHeading>{i18n.t('Tournament Results')}</SectionHeading>
                {detailedStats?.recent_tournaments ? (
                  <TournamentsTable tournaments={detailedStats.recent_tournaments} />
                ) : (
                  <Box ta="center" c="dimmed" py="md">
                    {i18n.t(loading ? 'Loading...' : 'No tournament data available')}
                  </Box>
                )}
              </>
            )}

            {/* Trends Tab */}
            {activeTab === 'trends' && (
              <>
                <SectionHeading>{i18n.t('Performance Over Time')}</SectionHeading>
                {detailedStats?.performance_trend && detailedStats.performance_trend.length > 0 ? (
                  <PerformanceTrendChart trend={detailedStats.performance_trend} />
                ) : (
                  <Box ta="center" c="dimmed" py="md">
                    {i18n.t(loading ? 'Loading...' : 'Not enough data for trend analysis')}
                  </Box>
                )}

                {/* Comparison Charts with Median */}
                {medianStats && (
                  <Grid mt="lg">
                    {/* Radar Chart - Overall Comparison */}
                    <Grid.Col span={{ base: 12, md: 6 }} mb="lg">
                      <Card className="cb-bg-panel" p="md" radius="md" h="100%">
                        <SectionHeading>{i18n.t('Stats vs Median (Normalized)')}</SectionHeading>
                        <ResponsiveContainer width="100%" height={250}>
                          <RadarChart
                            data={[
                              {
                                stat: i18n.t('Points'),
                                player: Math.min(
                                  (player.total_points / Math.max(medianStats.points, 1)) * 50,
                                  100,
                                ),
                                median: 50,
                              },
                              {
                                stat: i18n.t('Wins'),
                                player: Math.min(
                                  (player.total_wins_count / Math.max(medianStats.wins, 1)) * 50,
                                  100,
                                ),
                                median: 50,
                              },
                              {
                                stat: i18n.t('Win Rate'),
                                player: Math.min(
                                  (playerWinRate / Math.max(medianStats.winRate, 1)) * 50,
                                  100,
                                ),
                                median: 50,
                              },
                              {
                                stat: i18n.t('Score'),
                                player: Math.min(
                                  (player.total_score / Math.max(medianStats.score, 1)) * 50,
                                  100,
                                ),
                                median: 50,
                              },
                              {
                                stat: i18n.t('Tournaments'),
                                player: Math.min(
                                  (player.tournaments_count /
                                    Math.max(medianStats.tournaments, 1)) *
                                    50,
                                  100,
                                ),
                                median: 50,
                              },
                            ]}
                          >
                            <PolarGrid stroke="#444" />
                            <PolarAngleAxis dataKey="stat" stroke="#999" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={false}
                              axisLine={false}
                            />
                            <Radar
                              name={i18n.t('You')}
                              dataKey="player"
                              stroke="#0dcaf0"
                              fill="#0dcaf0"
                              fillOpacity={0.5}
                            />
                            <Radar
                              name={i18n.t('Median')}
                              dataKey="median"
                              stroke="#6c757d"
                              fill="#6c757d"
                              fillOpacity={0.2}
                            />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </Card>
                    </Grid.Col>

                    {/* Bar Chart - Points Comparison */}
                    <Grid.Col span={{ base: 12, md: 6 }} mb="lg">
                      <Card className="cb-bg-panel" p="md" radius="md" h="100%">
                        <SectionHeading>{i18n.t('Your Stats vs Median')}</SectionHeading>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={[
                              {
                                name: i18n.t('Points'),
                                you: player.total_points,
                                median: medianStats.points,
                              },
                              {
                                name: i18n.t('Score'),
                                you: player.total_score,
                                median: medianStats.score,
                              },
                              {
                                name: i18n.t('Wins'),
                                you: player.total_wins_count,
                                median: medianStats.wins,
                              },
                              {
                                name: i18n.t('Games'),
                                you: player.total_games_count,
                                median: medianStats.games,
                              },
                            ]}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis type="number" stroke="#999" />
                            <YAxis type="category" dataKey="name" stroke="#999" width={60} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                              }}
                            />
                            <Legend />
                            <Bar dataKey="you" name={i18n.t('You')} fill="#0dcaf0" />
                            <Bar dataKey="median" name={i18n.t('Median')} fill="#6c757d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                    </Grid.Col>

                    {/* Win Rate Comparison */}
                    <Grid.Col span={{ base: 12, md: 6 }} mb="lg">
                      <Card className="cb-bg-panel" p="md" radius="md" h="100%">
                        <SectionHeading>{i18n.t('Win Rate Comparison')}</SectionHeading>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={[
                              {
                                name: i18n.t('Win Rate %'),
                                you: playerWinRate,
                                median: Math.round(medianStats.winRate),
                              },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="name" stroke="#999" />
                            <YAxis stroke="#999" domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                              }}
                              formatter={(value) => [`${value}%`, '']}
                            />
                            <Legend />
                            <Bar dataKey="you" name={i18n.t('You')} fill="#198754" />
                            <Bar dataKey="median" name={i18n.t('Median')} fill="#6c757d" />
                            <ReferenceLine
                              y={50}
                              stroke="#ffc107"
                              strokeDasharray="3 3"
                              label={{ value: '50%', fill: '#ffc107', fontSize: 10 }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                    </Grid.Col>

                    {/* Percentile Gauge */}
                    <Grid.Col span={{ base: 12, md: 6 }} mb="lg">
                      <Card className="cb-bg-panel" p="md" radius="md" h="100%">
                        <SectionHeading>{i18n.t('Your Ranking Percentile')}</SectionHeading>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: i18n.t('Your Percentile'),
                                  value: percentile,
                                  fill: '#0dcaf0',
                                },
                                {
                                  name: i18n.t('Above You'),
                                  value: 100 - percentile,
                                  fill: '#2d2d2d',
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              startAngle={180}
                              endAngle={0}
                              dataKey="value"
                            >
                              <Cell fill="#0dcaf0" />
                              <Cell fill="#2d2d2d" />
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <Box ta="center" style={{ marginTop: '-60px' }}>
                          <Text fz="1.75rem" fw={700} c="cyan">
                            {i18n.t('Top %{percent}%', { percent: 100 - percentile })}
                          </Text>
                          <Text c="dimmed" size="sm">
                            {i18n.t('Better than %{percent}% of players', {
                              percent: percentile,
                            })}
                          </Text>
                        </Box>
                      </Card>
                    </Grid.Col>
                  </Grid>
                )}

                {/* Points distribution bar chart */}
                {detailedStats?.grade_stats && (
                  <Grid mt="sm">
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Card className="cb-bg-panel" p="md" radius="md">
                        <SectionHeading>{i18n.t('Points Distribution by Grade')}</SectionHeading>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={ALL_GRADES.map((grade) => {
                              const gradeData = detailedStats.grade_stats?.find(
                                (g) => g.grade === grade,
                              );
                              return {
                                name: formatGradeName(grade),
                                points: gradeData?.total_points || 0,
                                fill: GRADE_COLORS[grade],
                              };
                            })}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="name" stroke="#999" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#999" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                              }}
                              formatter={(value) => [
                                Number(value).toLocaleString(),
                                i18n.t('Points'),
                              ]}
                            />
                            <Bar dataKey="points" name={i18n.t('Points')}>
                              {ALL_GRADES.map((grade) => (
                                <Cell key={`cell-${grade}`} fill={GRADE_COLORS[grade]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Card className="cb-bg-panel" p="md" radius="md">
                        <SectionHeading>{i18n.t('Wins by Grade')}</SectionHeading>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={detailedStats.grade_stats.map((g) => ({
                              name: formatGradeName(g.grade),
                              wins: g.total_wins,
                              games: g.total_games,
                              fill: GRADE_COLORS[g.grade],
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="name" stroke="#999" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#999" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                              }}
                            />
                            <Bar dataKey="wins" name={i18n.t('Wins')} fill="#198754" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                    </Grid.Col>
                  </Grid>
                )}
              </>
            )}
          </Box>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default PlayerInsightsModal;
