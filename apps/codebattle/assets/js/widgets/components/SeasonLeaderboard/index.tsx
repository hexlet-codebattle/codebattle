import React, { memo, useMemo, useCallback } from 'react';

import { faChartLine, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Avatar,
  Box,
  Button,
  Flex,
  Grid,
  Group,
  NativeSelect,
  Pagination as MantinePagination,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import cn from 'classnames';

import i18n from '../../../i18n';
import UserInfo from '../UserInfo';

// Constants
export const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];
export const DEFAULT_ITEMS_PER_PAGE = 25;

export const GRADE_COLORS: Record<string, string> = {
  grand_slam: 'var(--cb-grade-grand_slam)',
  masters: 'var(--cb-grade-masters)',
  elite: 'var(--cb-grade-elite)',
  pro: 'var(--cb-grade-pro)',
  challenger: 'var(--cb-grade-challenger)',
  rookie: 'var(--cb-grade-rookie)',
};

export const ALL_GRADES = ['grand_slam', 'masters', 'elite', 'pro', 'challenger', 'rookie'];

export const getPlaceBadgeClass = (place?: number) => {
  switch (place) {
    case 1:
      return 'bg-warning text-dark';
    case 2:
      return 'bg-secondary';
    case 3:
      return 'bg-bronze';
    default:
      return 'bg-primary';
  }
};

export const getMedalEmoji = (place?: number) => {
  switch (place) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return null;
  }
};

export const getRowBorderStyle = (place?: number): React.CSSProperties => {
  switch (place) {
    case 1:
      return { borderLeft: '3px solid #ffc107' };
    case 2:
      return { borderLeft: '3px solid #6c757d' };
    case 3:
      return { borderLeft: '3px solid #cd7f32' };
    default:
      return {};
  }
};

const getLeaderboardRowClassName = (place?: number) =>
  cn('cb-custom-event-tr-border', {
    'cb-gold-place-bg': place === 1,
    'cb-silver-place-bg': place === 2,
    'cb-bronze-place-bg': place === 3,
  });

// Shared Table.Td props: keep the `cb-custom-event-td` design class (its column
// dividers via ::after and rounded first/last cells need position:relative),
// and port the Bootstrap `p-1 pl-4 align-middle text-nowrap border-0` to props.
const cellProps = {
  className: 'cb-custom-event-td',
  p: 'xs',
  pl: 'lg',
  style: {
    position: 'relative' as const,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    border: 0,
  },
};

export const formatTime = (seconds?: number) => {
  if (!seconds) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

export const formatGradeName = (grade: string) => {
  const names: Record<string, string> = {
    grand_slam: i18n.t('Grand Slam'),
    masters: i18n.t('Masters'),
    elite: i18n.t('Elite'),
    pro: i18n.t('Pro'),
    challenger: i18n.t('Challenger'),
    rookie: i18n.t('Rookie'),
  };
  return names[grade] || grade;
};

export const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
};

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface LeaderboardResult {
  user_id: number;
  user_name: string;
  user_lang?: string;
  avatar_url?: string;
  clan_name?: string;
  place: number;
  total_points: number;
  total_wins_count: number;
  total_games_count: number;
  total_score: number;
  tournaments_count: number;
  avg_place?: number;
  best_place?: number;
  total_time?: number;
}

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string, direction: 'asc' | 'desc') => void;
}

// Sortable column header component
export function SortableHeader({ label, sortKey, currentSort, onSort }: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const nextDirection = isActive && currentSort.direction === 'asc' ? 'desc' : 'asc';

  return (
    <Table.Th
      scope="col"
      onClick={() => onSort(sortKey, nextDirection)}
      title={i18n.t('Sort by %{label}', { label })}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <Group gap={4} align="center" wrap="nowrap">
        {label}
        <Text component="span" style={{ opacity: isActive ? 1 : 0.25 }}>
          {isActive && currentSort.direction === 'asc' ? '↑' : '↓'}
        </Text>
      </Group>
    </Table.Th>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
}

// Pagination component
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
}: PaginationProps) {
  if (totalPages <= 1 && totalItems <= ITEMS_PER_PAGE_OPTIONS[0]) {
    return null;
  }

  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      justify="space-between"
      align="center"
      p="md"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <Group gap="xs" mb={{ base: 'sm', md: 0 }}>
        <Text c="dimmed" size="sm">
          {i18n.t('Show')}
        </Text>
        <NativeSelect
          size="xs"
          w="auto"
          aria-label={i18n.t('Show')}
          value={String(itemsPerPage)}
          onChange={(e) => onItemsPerPageChange(Number(e.currentTarget.value))}
          data={ITEMS_PER_PAGE_OPTIONS.map(String)}
        />
        <Text c="dimmed" size="sm">
          {i18n.t('of %{count} players', { count: totalItems })}
        </Text>
      </Group>

      {totalPages > 1 && (
        <MantinePagination
          size="sm"
          withEdges
          value={currentPage}
          total={totalPages}
          onChange={onPageChange}
          aria-label={i18n.t('Leaderboard pagination')}
        />
      )}
    </Flex>
  );
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  clanFilter: string;
  onClanFilterChange: (value: string) => void;
  langFilter: string;
  onLangFilterChange: (value: string) => void;
  uniqueClans: string[];
  uniqueLangs: string[];
  onReset: () => void;
}

// Search and filter bar
export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  clanFilter,
  onClanFilterChange,
  langFilter,
  onLangFilterChange,
  uniqueClans,
  uniqueLangs,
  onReset,
}: SearchFilterBarProps) {
  const hasFilters = searchQuery || clanFilter || langFilter;

  return (
    <Box
      p="md"
      className="cb-season-leaderboard-filters"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Grid gap="xs" align="flex-end">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Flex align="center" wrap="nowrap" className="cb-season-filter-input-group">
            <Box
              className="cb-season-filter-prefix"
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </Box>
            <TextInput
              id="search-player"
              flex={1}
              aria-label={i18n.t('Search player')}
              classNames={{ input: 'cb-season-filter-control' }}
              placeholder={i18n.t('Search by name...')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.currentTarget.value)}
            />
            {searchQuery && (
              <UnstyledButton
                className="cb-season-filter-clear-btn"
                aria-label={i18n.t('Clear search')}
                onClick={() => onSearchChange('')}
              >
                ×
              </UnstyledButton>
            )}
          </Flex>
        </Grid.Col>
        <Grid.Col span={{ base: 6, md: 3 }}>
          <NativeSelect
            id="filter-clan"
            aria-label={i18n.t('Filter by clan')}
            classNames={{ input: 'cb-season-filter-control' }}
            value={clanFilter}
            onChange={(e) => onClanFilterChange(e.currentTarget.value)}
            data={[
              { value: '', label: i18n.t('All Clans') },
              ...uniqueClans.map((clan) => String(clan)),
            ]}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, md: 3 }}>
          <NativeSelect
            id="filter-lang"
            aria-label={i18n.t('Filter by language')}
            classNames={{ input: 'cb-season-filter-control' }}
            value={langFilter}
            onChange={(e) => onLangFilterChange(e.currentTarget.value)}
            data={[
              { value: '', label: i18n.t('All Languages') },
              ...uniqueLangs.map((lang) => String(lang)),
            ]}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 2 }}>
          {hasFilters && (
            <Button
              variant="default"
              w="100%"
              className="cb-season-filter-reset-btn"
              onClick={onReset}
            >
              {i18n.t('Clear Filters')}
            </Button>
          )}
        </Grid.Col>
      </Grid>
    </Box>
  );
}

// Leaderboard Table Row
const truncateText = (text?: string, maxLength = 12) =>
  text && text.length > maxLength ? text.slice(0, maxLength) : text;

interface LeaderboardRowProps {
  result: LeaderboardResult;
  onShowInsights: (result: LeaderboardResult) => void;
  showInsightsButton?: boolean;
}

const LeaderboardRow = memo(
  ({ result, onShowInsights, showInsightsButton }: LeaderboardRowProps) => {
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
      <Table.Tr className={getLeaderboardRowClassName(result.place)} fw={700}>
        <Table.Th scope="row" {...cellProps}>
          <Text component="span" c="white">
            {result.place}
          </Text>
        </Table.Th>
        <Table.Td {...cellProps}>
          <Group gap="sm" wrap="nowrap">
            {result.avatar_url && (
              <Avatar src={result.avatar_url} alt={result.user_name} size={32} radius="xl" />
            )}
            <UserInfo
              user={user}
              lang={result.user_lang}
              hideOnlineIndicator
              hideRank
              displayName={displayName}
              className={cn('text-decoration-none', {
                'fw-bold text-white': result.place <= 3,
                'text-light': result.place > 3,
              })}
              linkClassName={cn('text-decoration-none', {
                'fw-bold text-white': result.place <= 3,
                'text-light': result.place > 3,
              })}
            />
          </Group>
        </Table.Td>
        <Table.Td {...cellProps}>
          {result.clan_name ? (
            <Text component="span" c="white" title={result.clan_name}>
              {displayClan}
            </Text>
          ) : (
            <Text component="span" c="dimmed">
              -
            </Text>
          )}
        </Table.Td>
        <Table.Td {...cellProps} fw={700} c="white">
          {result.total_points}
        </Table.Td>
        <Table.Td {...cellProps}>{result.total_wins_count}</Table.Td>
        <Table.Td {...cellProps}>{result.total_score}</Table.Td>
        <Table.Td {...cellProps}>{result.tournaments_count}</Table.Td>
        <Table.Td {...cellProps}>
          {result.avg_place ? Number(result.avg_place).toFixed(1) : '-'}
        </Table.Td>
        {showInsightsButton && (
          <Table.Td {...cellProps} ta="center">
            <Button
              size="compact-sm"
              variant="outline"
              color="gray"
              onClick={() => onShowInsights(result)}
              title={i18n.t('View player insights')}
              leftSection={<FontAwesomeIcon icon={faChartLine} />}
            >
              {i18n.t('Stats')}
            </Button>
          </Table.Td>
        )}
      </Table.Tr>
    );
  },
);

LeaderboardRow.displayName = 'LeaderboardRow';

interface LeaderboardTableProps {
  results: LeaderboardResult[];
  onShowInsights: (result: LeaderboardResult) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  clanFilter: string;
  onClanFilterChange: (value: string) => void;
  langFilter: string;
  onLangFilterChange: (value: string) => void;
  uniqueClans: string[];
  uniqueLangs: string[];
  onResetFilters: () => void;
  sortConfig: SortConfig;
  onSort: (key: string, direction: 'asc' | 'desc') => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  displayedResults: LeaderboardResult[];
  showInsightsButton?: boolean;
}

// Main Leaderboard Table Component
export function LeaderboardTable({
  results,
  onShowInsights,
  searchQuery,
  onSearchChange,
  clanFilter,
  onClanFilterChange,
  langFilter,
  onLangFilterChange,
  uniqueClans,
  uniqueLangs,
  onResetFilters,
  sortConfig,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  displayedResults,
  showInsightsButton = true,
}: LeaderboardTableProps) {
  if (results.length === 0) {
    return (
      <Box ta="center" py="xl">
        <Text c="dimmed" mb={0}>
          {i18n.t('No results yet')}
        </Text>
      </Box>
    );
  }

  return (
    <>
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        clanFilter={clanFilter}
        onClanFilterChange={onClanFilterChange}
        langFilter={langFilter}
        onLangFilterChange={onLangFilterChange}
        uniqueClans={uniqueClans}
        uniqueLangs={uniqueLangs}
        onReset={onResetFilters}
      />

      {displayedResults.length === 0 ? (
        <Box ta="center" py="xl">
          <Text c="dimmed" mb={0}>
            {i18n.t('No players match your filters')}
          </Text>
          <Button size="compact-sm" variant="outline" color="gray" mt="sm" onClick={onResetFilters}>
            {i18n.t('Clear Filters')}
          </Button>
        </Box>
      ) : (
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover mb={0} className="cb-table cb-custom-event-table">
            <Table.Thead>
              <Table.Tr>
                <SortableHeader
                  label="#"
                  sortKey="place"
                  currentSort={sortConfig}
                  onSort={onSort}
                />
                <SortableHeader
                  label={i18n.t('Player')}
                  sortKey="user_name"
                  currentSort={sortConfig}
                  onSort={onSort}
                />
                <SortableHeader
                  label={i18n.t('Clan')}
                  sortKey="clan_name"
                  currentSort={sortConfig}
                  onSort={onSort}
                />
                <SortableHeader
                  label={i18n.t('Points')}
                  sortKey="total_points"
                  currentSort={sortConfig}
                  onSort={onSort}
                />
                <SortableHeader
                  label={i18n.t('Wins')}
                  sortKey="total_wins_count"
                  currentSort={sortConfig}
                  onSort={onSort}
                />
                <SortableHeader
                  label={i18n.t('Score')}
                  sortKey="total_score"
                  currentSort={sortConfig}
                  onSort={onSort}
                />
                <SortableHeader
                  label={i18n.t('Tournaments')}
                  sortKey="tournaments_count"
                  currentSort={sortConfig}
                  onSort={onSort}
                />
                <SortableHeader
                  label={i18n.t('Avg Place')}
                  sortKey="avg_place"
                  currentSort={sortConfig}
                  onSort={onSort}
                />
                {showInsightsButton && (
                  <Table.Th scope="col" ta="center">
                    {i18n.t('Insights')}
                  </Table.Th>
                )}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {displayedResults.map((result) => (
                <LeaderboardRow
                  key={result.user_id}
                  result={result}
                  onShowInsights={onShowInsights}
                  showInsightsButton={showInsightsButton}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={onItemsPerPageChange}
      />
    </>
  );
}

// Custom hook for leaderboard state management
export const useLeaderboardState = (results: LeaderboardResult[]) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [clanFilter, setClanFilter] = React.useState('');
  const [langFilter, setLangFilter] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    key: 'place',
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(DEFAULT_ITEMS_PER_PAGE);

  // Get unique clans and languages for filter dropdowns
  const uniqueClans = useMemo(
    () => [...new Set(results.map((r) => r.clan_name).filter(Boolean))].sort(),
    [results],
  );

  const uniqueLangs = useMemo(
    () => [...new Set(results.map((r) => r.user_lang).filter(Boolean))].sort(),
    [results],
  );

  // Filter results
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.user_name.toLowerCase().includes(query));
    }

    if (clanFilter) {
      filtered = filtered.filter((r) => r.clan_name === clanFilter);
    }

    if (langFilter) {
      filtered = filtered.filter((r) => r.user_lang === langFilter);
    }

    return filtered;
  }, [results, searchQuery, clanFilter, langFilter]);

  // Sort filtered results
  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];
    const { key, direction } = sortConfig;

    sorted.sort((a, b) => {
      let aValue = (a as unknown as Record<string, unknown>)[key] as
        | string
        | number
        | null
        | undefined;
      let bValue = (b as unknown as Record<string, unknown>)[key] as
        | string
        | number
        | null
        | undefined;

      // Handle null/undefined values
      if (aValue == null) aValue = key === 'clan_name' || key === 'user_lang' ? '' : Infinity;
      if (bValue == null) bValue = key === 'clan_name' || key === 'user_lang' ? '' : Infinity;

      // String comparison for text fields
      if (key === 'user_name' || key === 'clan_name' || key === 'user_lang') {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredResults, sortConfig]);

  // Paginate sorted results
  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);
  const displayedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedResults.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedResults, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleClanFilterChange = useCallback((value: string) => {
    setClanFilter(value);
    setCurrentPage(1);
  }, []);

  const handleLangFilterChange = useCallback((value: string) => {
    setLangFilter(value);
    setCurrentPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setClanFilter('');
    setLangFilter('');
    setSortConfig({ key: 'place', direction: 'asc' });
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  }, []);

  return {
    searchQuery,
    clanFilter,
    langFilter,
    sortConfig,
    currentPage,
    totalPages,
    itemsPerPage,
    uniqueClans,
    uniqueLangs,
    sortedResults,
    displayedResults,
    handleSearchChange,
    handleClanFilterChange,
    handleLangFilterChange,
    handleResetFilters,
    handleSort,
    handlePageChange,
    handleItemsPerPageChange,
  };
};
