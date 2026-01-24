import React, { memo, useState, useMemo } from 'react';

import cn from 'classnames';
import Gon from 'gon';

import LanguageIcon from '../../components/LanguageIcon';
import PlayerInsightsModal from '../../components/PlayerInsightsModal';
import {
  LeaderboardTable,
  useLeaderboardState,
  getMedalEmoji,
} from '../../components/SeasonLeaderboard';

function StatBox({ label, value, highlight = false }) {
  return (
    <div className="text-center">
      <div className={cn('fw-bold', highlight ? 'fs-3 text-warning' : 'fs-5 text-white')}>
        {value}
      </div>
      <div className="text-muted small text-uppercase">{label}</div>
    </div>
  );
}

function PodiumCard({ result, isFirst = false }) {
  return (
    <div
      className={cn('card h-100 border-0 shadow-lg cb-hof-podium-card', {
        'cb-gold-place-bg': result.place === 1,
        'cb-silver-place-bg': result.place === 2,
        'cb-bronze-place-bg': result.place === 3,
      })}
    >
      <div className={cn('card-body text-center', isFirst ? 'py-4' : 'py-3')}>
        <div className={cn('mb-2', isFirst ? 'fs-1' : 'fs-2')}>
          {getMedalEmoji(result.place)}
        </div>
        {result.avatar_url && (
        <img
          src={result.avatar_url}
          alt={result.user_name}
          className="rounded-circle mb-2"
          style={{ width: isFirst ? '64px' : '48px', height: isFirst ? '64px' : '48px' }}
        />
      )}
        <h4 className={cn('card-title text-white mb-2', isFirst && 'fs-3')}>
          {result.user_name}
        </h4>
        <div className="mb-3">
          {result.user_lang && (
          <span className="mr-2">
            <LanguageIcon lang={result.user_lang} style={{ width: '20px', height: '20px' }} />
          </span>
        )}
          {result.clan_name && (
            <span className="text-muted">{result.clan_name}</span>
          )}
        </div>
        <div className={cn('d-flex justify-content-center', isFirst ? 'mt-4' : 'mt-3')}>
          <div className="px-3"><StatBox label="Points" value={result.total_points} highlight={isFirst} /></div>
          <div className="px-3"><StatBox label="Wins" value={result.total_wins_count} /></div>
        </div>
        <div className="d-flex justify-content-center mt-3">
          <div className="px-3"><StatBox label="Score" value={result.total_score} /></div>
          <div className="px-3"><StatBox label="Tournaments" value={result.tournaments_count} /></div>
        </div>
      </div>
    </div>
  );
}

function ChampionsPodium({ top3 }) {
  if (!top3 || top3.length === 0) return null;

  const first = top3.find((r) => r.place === 1);
  const second = top3.find((r) => r.place === 2);
  const third = top3.find((r) => r.place === 3);

  return (
    <div className="mb-5">
      <h2 className="text-gold mb-4 text-center">Champions</h2>
      <div className="row align-items-end justify-content-center">
        {/* Second place - left */}
        <div className="col-md-4 col-lg-3">
          {second && (
            <div style={{ marginTop: '2rem' }}>
              <PodiumCard result={second} />
            </div>
          )}
        </div>

        {/* First place - center, elevated */}
        <div className="col-md-4 col-lg-3">
          {first && <PodiumCard result={first} isFirst />}
        </div>

        {/* Third place - right */}
        <div className="col-md-4 col-lg-3">
          {third && (
            <div style={{ marginTop: '3rem' }}>
              <PodiumCard result={third} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SeasonShowPage() {
  const season = (Gon && Gon.getAsset && Gon.getAsset('season')) || null;

  // Memoize results to ensure stable reference
  const results = useMemo(
    () => (Gon && Gon.getAsset && Gon.getAsset('results')) || [],
    [],
  );

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Use shared leaderboard state hook
  const leaderboardState = useLeaderboardState(results);

  const handleShowInsights = (player) => {
    setSelectedPlayer(player);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlayer(null);
  };

  if (!season) {
    return (
      <div className="cb-bg-panel cb-text min-vh-100 py-5">
        <div className="container">
          <div className="card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light">
            <div className="card-body text-center py-5">
              <p className="text-muted mb-0">Season not found</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const top3 = results.slice(0, 3);

  // Determine season status
  const now = new Date();
  const startsAt = season.starts_at ? new Date(season.starts_at) : null;
  const endsAt = season.ends_at ? new Date(season.ends_at) : null;

  let seasonStatus = 'active';
  if (startsAt && now < startsAt) {
    seasonStatus = 'upcoming';
  } else if (endsAt && now > endsAt) {
    seasonStatus = 'completed';
  }

  const statusBadge = {
    upcoming: { class: 'bg-info', text: 'Upcoming' },
    active: { class: 'bg-success', text: 'Active' },
    completed: { class: 'bg-secondary', text: 'Completed' },
  }[seasonStatus];

  return (
    <div className="cb-bg-panel cb-text min-vh-100 py-5">
      <div className="container">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-5">
          <div>
            <div className="d-flex align-items-center mb-2">
              <h1 className="text-gold fw-bold mb-0 mr-2">
                {season.name}
                {' '}
                {season.year}
              </h1>
              <span className={cn('badge', statusBadge.class)}>{statusBadge.text}</span>
            </div>
            <div className="text-muted">
              <i className="bi bi-calendar3 mr-2" />
              {season.starts_at}
              {' — '}
              {season.ends_at}
            </div>
          </div>
          <div className="d-flex mt-3 mt-md-0">
            <a href="/seasons" className="btn btn-outline-gold mr-2">
              All Seasons
            </a>
            <a href="/hall_of_fame" className="btn btn-outline-gold">
              Hall of Fame
            </a>
          </div>
        </div>

        {/* Champions Podium */}
        <ChampionsPodium top3={top3} />

        {/* Full Leaderboard */}
        <div className="card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light">
          <div className="card-header bg-transparent border-bottom border-secondary py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h2 className="mb-0 text-gold fs-4">Full Leaderboard</h2>
              <span className="badge bg-secondary">
                {results.length}
                {' '}
                players
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            <LeaderboardTable
              results={results}
              onShowInsights={handleShowInsights}
              searchQuery={leaderboardState.searchQuery}
              onSearchChange={leaderboardState.handleSearchChange}
              clanFilter={leaderboardState.clanFilter}
              onClanFilterChange={leaderboardState.handleClanFilterChange}
              langFilter={leaderboardState.langFilter}
              onLangFilterChange={leaderboardState.handleLangFilterChange}
              uniqueClans={leaderboardState.uniqueClans}
              uniqueLangs={leaderboardState.uniqueLangs}
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
          </div>
        </div>

        {/* Player Insights Modal */}
        <PlayerInsightsModal
          show={showModal}
          onHide={handleCloseModal}
          player={selectedPlayer}
          allResults={results}
          season={season}
        />
      </div>
    </div>
  );
}

export default memo(SeasonShowPage);
