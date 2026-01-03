import React, { memo, useMemo, useCallback } from 'react';

import cn from 'classnames';

import LanguageIcon from '../LanguageIcon';

// Constants
export const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];
export const DEFAULT_ITEMS_PER_PAGE = 25;

export const GRADE_COLORS = {
  grand_slam: '#ffd700',
  masters: '#e91e63',
  elite: '#9c27b0',
  pro: '#2196f3',
  challenger: '#4caf50',
  rookie: '#ff9800',
};

export const ALL_GRADES = ['grand_slam', 'masters', 'elite', 'pro', 'challenger', 'rookie'];

export const getPlaceBadgeClass = (place) => {
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

export const getMedalEmoji = (place) => {
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

export const getRowBorderStyle = (place) => {
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

export const formatTime = (seconds) => {
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

export const formatGradeName = (grade) => {
  const names = {
    grand_slam: 'Grand Slam',
    masters: 'Masters',
    elite: 'Elite',
    pro: 'Pro',
    challenger: 'Challenger',
    rookie: 'Rookie',
  };
  return names[grade] || grade;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Sortable column header component
export function SortableHeader({
  label, sortKey, currentSort, onSort,
}) {
  const isActive = currentSort.key === sortKey;
  const nextDirection = isActive && currentSort.direction === 'asc' ? 'desc' : 'asc';

  return (
    <th
      scope="col"
      className="cursor-pointer user-select-none"
      style={{ cursor: 'pointer' }}
      onClick={() => onSort(sortKey, nextDirection)}
      title={`Sort by ${label}`}
    >
      <div className="d-flex align-items-center">
        {label}
        <span className={cn('ml-1', { 'opacity-25': !isActive })}>
          {isActive && currentSort.direction === 'asc' ? '↑' : '↓'}
        </span>
      </div>
    </th>
  );
}

// Pagination component
export function Pagination({
  currentPage, totalPages, onPageChange, totalItems, itemsPerPage, onItemsPerPageChange,
}) {
  const pages = useMemo(() => {
    const result = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i += 1) {
      result.push(i);
    }
    return result;
  }, [currentPage, totalPages]);

  if (totalPages <= 1 && totalItems <= ITEMS_PER_PAGE_OPTIONS[0]) {
    return null;
  }

  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 border-top border-secondary">
      <div className="d-flex align-items-center mb-2 mb-md-0">
        <span className="text-muted small mr-2">Show</span>
        <select
          className="form-select form-select-sm bg-dark text-light border-secondary mx-2"
          style={{ width: 'auto' }}
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        >
          {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span className="text-muted small">
          of
          {' '}
          {totalItems}
          {' '}
          players
        </span>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Leaderboard pagination">
          <ul className="pagination pagination-sm mb-0">
            <li className={cn('page-item', { disabled: currentPage === 1 })}>
              <button
                type="button"
                className="page-link bg-dark text-light border-secondary"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
              >
                «
              </button>
            </li>
            <li className={cn('page-item', { disabled: currentPage === 1 })}>
              <button
                type="button"
                className="page-link bg-dark text-light border-secondary"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ‹
              </button>
            </li>
            {pages[0] > 1 && (
              <li className="page-item disabled">
                <span className="page-link bg-dark text-light border-secondary">...</span>
              </li>
            )}
            {pages.map((page) => (
              <li key={page} className={cn('page-item', { active: page === currentPage })}>
                <button
                  type="button"
                  className={cn('page-link border-secondary', {
                    'bg-info text-dark': page === currentPage,
                    'bg-dark text-light': page !== currentPage,
                  })}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </button>
              </li>
            ))}
            {pages[pages.length - 1] < totalPages && (
              <li className="page-item disabled">
                <span className="page-link bg-dark text-light border-secondary">...</span>
              </li>
            )}
            <li className={cn('page-item', { disabled: currentPage === totalPages })}>
              <button
                type="button"
                className="page-link bg-dark text-light border-secondary"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                ›
              </button>
            </li>
            <li className={cn('page-item', { disabled: currentPage === totalPages })}>
              <button
                type="button"
                className="page-link bg-dark text-light border-secondary"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                »
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

// Search and filter bar
export function SearchFilterBar({
  searchQuery, onSearchChange, clanFilter, onClanFilterChange, langFilter, onLangFilterChange,
  uniqueClans, uniqueLangs, onReset,
}) {
  const hasFilters = searchQuery || clanFilter || langFilter;

  return (
    <div className="p-3 border-bottom border-secondary">
      <div className="row align-items-end">
        <div className="col-12 col-md-4">
          <label htmlFor="search-player" className="form-label text-muted small mb-1">Search Player</label>
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-dark border-secondary text-muted">
              <i className="bi bi-search" />
            </span>
            <input
              id="search-player"
              type="text"
              className="form-control bg-dark text-light border-secondary"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => onSearchChange('')}
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div className="col-6 col-md-3">
          <label htmlFor="filter-clan" className="form-label text-muted small mb-1">Clan</label>
          <select
            id="filter-clan"
            className="form-select form-select-sm bg-dark text-light border-secondary"
            value={clanFilter}
            onChange={(e) => onClanFilterChange(e.target.value)}
          >
            <option value="">All Clans</option>
            {uniqueClans.map((clan) => (
              <option key={clan} value={clan}>{clan}</option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <label htmlFor="filter-lang" className="form-label text-muted small mb-1">Language</label>
          <select
            id="filter-lang"
            className="form-select form-select-sm bg-dark text-light border-secondary"
            value={langFilter}
            onChange={(e) => onLangFilterChange(e.target.value)}
          >
            <option value="">All Languages</option>
            {uniqueLangs.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-2">
          {hasFilters && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100"
              onClick={onReset}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Leaderboard Table Row
const LeaderboardRow = memo(({ result, onShowInsights, showInsightsButton }) => (
  <tr style={getRowBorderStyle(result.place)}>
    <th scope="row">
      <span className={cn('badge', getPlaceBadgeClass(result.place))}>
        {result.place <= 3 ? getMedalEmoji(result.place) : result.place}
      </span>
    </th>
    <td>
      <div className="d-flex align-items-center">
        {result.avatar_url && (
          <img
            src={result.avatar_url}
            alt={result.user_name}
            className="rounded mr-2"
            style={{ width: '24px', height: '24px' }}
          />
        )}
        <a
          href={`/users/${result.user_id}`}
          className={cn('text-decoration-none', {
            'fw-bold text-white': result.place <= 3,
            'text-light': result.place > 3,
          })}
        >
          {result.user_name}
        </a>
      </div>
    </td>
    <td>
      {result.user_lang ? (
        <LanguageIcon lang={result.user_lang} style={{ width: '20px', height: '20px' }} />
      ) : (
        <span className="text-muted">-</span>
      )}
    </td>
    <td>
      {result.clan_name ? (
        <span className="text-info">{result.clan_name}</span>
      ) : (
        <span className="text-muted">-</span>
      )}
    </td>
    <td className="fw-bold text-warning">{result.total_points}</td>
    <td>{result.total_wins_count}</td>
    <td>{result.total_score}</td>
    <td>{result.tournaments_count}</td>
    <td>{result.avg_place ? Number(result.avg_place).toFixed(1) : '-'}</td>
    <td>
      {result.best_place ? (
        <span className={cn('badge', getPlaceBadgeClass(result.best_place))}>
          {result.best_place}
        </span>
      ) : '-'}
    </td>
    {showInsightsButton && (
      <td className="text-center">
        <button
          type="button"
          className="btn btn-sm btn-outline-info"
          onClick={() => onShowInsights(result)}
          title="View player insights"
        >
          <i className="bi bi-bar-chart-line" />
          {' '}
          Stats
        </button>
      </td>
    )}
  </tr>
));

LeaderboardRow.displayName = 'LeaderboardRow';

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
}) {
  if (results.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted mb-0">No results yet</p>
      </div>
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
        <div className="text-center py-5">
          <p className="text-muted mb-0">No players match your filters</p>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mt-2"
            onClick={onResetFilters}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-dark table-striped table-hover mb-0 cb-table">
            <thead>
              <tr>
                <SortableHeader label="#" sortKey="place" currentSort={sortConfig} onSort={onSort} />
                <SortableHeader label="Player" sortKey="user_name" currentSort={sortConfig} onSort={onSort} />
                <SortableHeader label="Lang" sortKey="user_lang" currentSort={sortConfig} onSort={onSort} />
                <SortableHeader label="Clan" sortKey="clan_name" currentSort={sortConfig} onSort={onSort} />
                <SortableHeader label="Points" sortKey="total_points" currentSort={sortConfig} onSort={onSort} />
                <SortableHeader label="Wins" sortKey="total_wins_count" currentSort={sortConfig} onSort={onSort} />
                <SortableHeader label="Score" sortKey="total_score" currentSort={sortConfig} onSort={onSort} />
                <SortableHeader label="Tournaments" sortKey="tournaments_count" currentSort={sortConfig} onSort={onSort} />
                <SortableHeader label="Avg Place" sortKey="avg_place" currentSort={sortConfig} onSort={onSort} />
                <SortableHeader label="Best" sortKey="best_place" currentSort={sortConfig} onSort={onSort} />
                {showInsightsButton && <th scope="col" className="text-center">Insights</th>}
              </tr>
            </thead>
            <tbody>
              {displayedResults.map((result) => (
                <LeaderboardRow
                  key={result.user_id}
                  result={result}
                  onShowInsights={onShowInsights}
                  showInsightsButton={showInsightsButton}
                />
              ))}
            </tbody>
          </table>
        </div>
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
export const useLeaderboardState = (results) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [clanFilter, setClanFilter] = React.useState('');
  const [langFilter, setLangFilter] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState({ key: 'place', direction: 'asc' });
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
      let aValue = a[key];
      let bValue = b[key];

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
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleClanFilterChange = useCallback((value) => {
    setClanFilter(value);
    setCurrentPage(1);
  }, []);

  const handleLangFilterChange = useCallback((value) => {
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

  const handleSort = useCallback((key, direction) => {
    setSortConfig({ key, direction });
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((value) => {
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
