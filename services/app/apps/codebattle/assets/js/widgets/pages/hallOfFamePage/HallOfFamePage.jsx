import React, { memo, useMemo, useState } from 'react';

import cn from 'classnames';
import Gon from 'gon';

import LanguageIcon from '../../components/LanguageIcon';
import PlayerInsightsModal from '../../components/PlayerInsightsModal';
import {
  LeaderboardTable,
  useLeaderboardState,
  getPlaceBadgeClass,
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
      <h2 className="text-gold mb-4 text-center">Top 3</h2>
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

function PreviousSeasonWinners({ previousSeasonsWinners }) {
  if (!previousSeasonsWinners || previousSeasonsWinners.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-gold">Previous Seasons Champions</h2>
        <a href="/seasons" className="btn btn-outline-gold btn-sm">
          View All Seasons
        </a>
      </div>

      {previousSeasonsWinners.map(({ season, winners }) => (
        <div
          key={season.id}
          className="card cb-bg-panel cb-border-color cb-rounded shadow-lg border-0 text-light mb-4"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
          }}
        >
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="card-title text-warning mb-0">
                {season.name}
                {' '}
                {season.year}
              </h4>
              <a
                href={`/seasons/${season.id}`}
                className="btn btn-sm btn-outline-gold"
              >
                Full Results
              </a>
            </div>

            <div className="row">
              {winners.map((winner) => (
                <div key={winner.user_id} className="col-md-4 mb-3">
                  <div
                    className={cn('card h-100 border-0 cb-hof-podium-card', {
                      'cb-gold-place-bg': winner.place === 1,
                      'cb-silver-place-bg': winner.place === 2,
                      'cb-bronze-place-bg': winner.place === 3,
                    })}
                  >
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-2">
                        <span className={cn('badge mr-2', getPlaceBadgeClass(winner.place))}>
                          {getMedalEmoji(winner.place)}
                        </span>
                        {winner.avatar_url && (
                          <img
                            src={winner.avatar_url}
                            alt={winner.user_name}
                            className="rounded mr-2"
                            style={{ width: '24px', height: '24px' }}
                          />
                        )}
                        <h6 className="mb-0 text-white">{winner.user_name}</h6>
                      </div>
                      <div className="small">
                        <div className="d-flex align-items-center mb-1">
                          {winner.user_lang && (
                            <span className="mr-2">
                              <LanguageIcon lang={winner.user_lang} style={{ width: '16px', height: '16px' }} />
                            </span>
                          )}
                          {winner.clan_name && (
                            <span className="text-muted">{winner.clan_name}</span>
                          )}
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Points:</span>
                          <span className="text-white fw-bold">{winner.total_points}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HallOfFamePage() {
  const currentSeason = (Gon && Gon.getAsset && Gon.getAsset('current_season')) || null;
  const currentSeasonResults = useMemo(
    () => (Gon && Gon.getAsset && Gon.getAsset('current_season_results')) || [],
    [],
  );
  const previousSeasonsWinners = (Gon && Gon.getAsset && Gon.getAsset('previous_seasons_winners')) || [];

  // Use the shared leaderboard state hook
  const leaderboardState = useLeaderboardState(currentSeasonResults);

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleShowInsights = (player) => {
    setSelectedPlayer(player);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlayer(null);
  };

  const top3 = currentSeasonResults.slice(0, 3);

  return (
    <div className="cb-bg-panel cb-text min-vh-100 py-5">
      <div className="container">
        <h1 className="text-center text-gold mb-5 fw-bold">Hall of Fame</h1>

        {currentSeason && (
          <>
            <div className="card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light mb-4">
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="card-title mb-2 text-gold">
                      {currentSeason.name}
                      {' '}
                      {currentSeason.year}
                    </h5>
                    <div className="d-flex flex-wrap small text-muted">
                      <span className="mr-3">
                        <strong>Starts:</strong>
                        {' '}
                        {currentSeason.starts_at}
                      </span>
                      <span>
                        <strong>Ends:</strong>
                        {' '}
                        {currentSeason.ends_at}
                      </span>
                    </div>
                  </div>
                  <a href="/seasons" className="btn btn-outline-gold">
                    View All Seasons
                  </a>
                </div>
              </div>
            </div>

            <ChampionsPodium top3={top3} />

            {currentSeasonResults.length > 0 && (
              <div className={cn('card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light')}>
                <div className="card-header bg-transparent border-bottom border-secondary py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h2 className="mb-0 text-gold fs-4">Current Season Leaderboard</h2>
                    <span className="badge bg-secondary">
                      {currentSeasonResults.length}
                      {' '}
                      players
                    </span>
                  </div>
                </div>
                <div className="card-body p-0">
                  <LeaderboardTable
                    results={currentSeasonResults}
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
            )}

            {/* Player Insights Modal */}
            <PlayerInsightsModal
              show={showModal}
              onHide={handleCloseModal}
              player={selectedPlayer}
              allResults={currentSeasonResults}
              season={currentSeason}
            />
          </>
        )}

        <PreviousSeasonWinners previousSeasonsWinners={previousSeasonsWinners} />
      </div>
    </div>
  );
}

export default memo(HallOfFamePage);
