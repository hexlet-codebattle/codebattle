import React, { memo } from 'react';

import cn from 'classnames';
import Gon from 'gon';

const getPlaceBadgeClass = place => {
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

const PodiumCard = ({ result, place }) => (
  <div className={cn('card cb-bg-panel cb-border-color cb-rounded shadow-lg border-2', {
    'border-warning': place === 1,
    'border-secondary': place === 2,
    'border-bronze': place === 3,
  })}
  >
    <div className="card-body text-center">
      <div className={cn('badge fs-4 mb-3', getPlaceBadgeClass(place))}>
        {place === 1 && '🥇'}
        {place === 2 && '🥈'}
        {place === 3 && '🥉'}
        {' '}
        {place}
      </div>
      <h5 className="card-title text-white">{result.user_name}</h5>
      <p className="text-muted small mb-2">
        {result.user_lang && (
          <span className="badge bg-dark me-2">{result.user_lang}</span>
        )}
        {result.clan_name && (
          <span className="badge bg-info">{result.clan_name}</span>
        )}
      </p>
      <div className="mt-3">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted">Points:</span>
          <span className="text-white fw-bold">{result.total_points}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted">Wins:</span>
          <span className="text-white">{result.total_wins_count}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span className="text-muted">Tournaments:</span>
          <span className="text-white">{result.tournaments_count}</span>
        </div>
      </div>
    </div>
  </div>
);

const HallOfFamePage = () => {
  const currentSeason = (Gon && Gon.getAsset && Gon.getAsset('current_season')) || null;
  const currentSeasonResults = (Gon && Gon.getAsset && Gon.getAsset('current_season_results')) || [];
  const previousSeasonsWinners = (Gon && Gon.getAsset && Gon.getAsset('previous_seasons_winners')) || [];

  const top3 = currentSeasonResults.slice(0, 3);

  return (
    <div className="cb-bg-panel cb-text min-vh-100 py-5">
      <div className="container">
        <h1 className="text-center text-white mb-5 fw-bold">Hall of Fame</h1>

        {currentSeason && (
          <>
            <div className="card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light mb-4">
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="card-title mb-2 text-white">
                      {currentSeason.name}
                      {' '}
                      {currentSeason.year}
                    </h5>
                    <div className="d-flex flex-wrap gap-3 small text-muted">
                      <span>
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
                  <a href="/seasons" className="btn btn-outline-primary">
                    View All Seasons
                  </a>
                </div>
              </div>
            </div>

            {top3.length > 0 && (
              <div className="mb-5">
                <h2 className="text-white mb-4 text-center">Top 3</h2>
                <div className="row g-4 justify-content-center">
                  {top3.map(result => (
                    <div key={result.user_id} className="col-md-4">
                      <PodiumCard result={result} place={result.place} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentSeasonResults.length > 0 && (
              <div className={cn('card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light')}>
                <div className="card-body">
                  <h2 className="card-title mb-4 text-white">Current Season Leaderboard</h2>
                  <div className="table-responsive">
                    <table className="table table-dark table-striped table-hover mb-0 cb-table">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Player</th>
                          <th scope="col">Clan</th>
                          <th scope="col">Points</th>
                          <th scope="col">Wins</th>
                          <th scope="col">Score</th>
                          <th scope="col">Tournaments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSeasonResults.map(result => (
                          <tr key={result.user_id}>
                            <th scope="row">
                              <span className={cn('badge', getPlaceBadgeClass(result.place))}>
                                {result.place}
                              </span>
                            </th>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="me-2">{result.user_name}</span>
                                {result.user_lang && (
                                  <span className="badge bg-dark text-xs">{result.user_lang}</span>
                                )}
                              </div>
                            </td>
                            <td>{result.clan_name || '-'}</td>
                            <td className="fw-bold">{result.total_points}</td>
                            <td>{result.total_wins_count}</td>
                            <td>{result.total_score}</td>
                            <td>{result.tournaments_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {previousSeasonsWinners.length > 0 && (
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="text-white">Previous Seasons Champions</h2>
              <a href="/seasons" className="btn btn-outline-light btn-sm">
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
                      className="btn btn-sm btn-outline-warning"
                    >
                      Full Results
                    </a>
                  </div>

                  <div className="row g-3">
                    {winners.map(winner => (
                      <div key={winner.user_id} className="col-md-4">
                        <div
                          className={cn('card h-100 border-2', {
                            'bg-dark border-warning': winner.place === 1,
                            'bg-dark border-secondary': winner.place === 2,
                            'bg-dark border-bronze': winner.place === 3,
                          })}
                        >
                          <div className="card-body">
                            <div className="d-flex align-items-center mb-2">
                              <span className={cn('badge me-2', getPlaceBadgeClass(winner.place))}>
                                {winner.place === 1 && '🥇'}
                                {winner.place === 2 && '🥈'}
                                {winner.place === 3 && '🥉'}
                              </span>
                              <h6 className="mb-0 text-white">{winner.user_name}</h6>
                            </div>
                            <div className="small">
                              {winner.clan_name && (
                                <div className="text-muted mb-1">
                                  <span className="badge bg-info">{winner.clan_name}</span>
                                </div>
                              )}
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
        )}
      </div>
    </div>
  );
};

export default memo(HallOfFamePage);
