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

const SeasonShowPage = () => {
  const season = (Gon && Gon.getAsset && Gon.getAsset('season')) || null;
  const results = (Gon && Gon.getAsset && Gon.getAsset('results')) || [];

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

  return (
    <div className="cb-bg-panel cb-text min-vh-100 py-5">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="text-white fw-bold mb-2">
              {season.name}
              {' '}
              {season.year}
            </h1>
            <div className="text-muted">
              {season.starts_at}
              {' '}
              -
              {' '}
              {season.ends_at}
            </div>
          </div>
          <div className="d-flex gap-2">
            <a href="/seasons" className="btn btn-outline-light">
              All Seasons
            </a>
            <a href="/hall_of_fame" className="btn btn-outline-primary">
              Hall of Fame
            </a>
          </div>
        </div>

        {top3.length > 0 && (
          <div className="mb-5">
            <h2 className="text-white mb-4 text-center">Champions</h2>
            <div className="row g-4 justify-content-center">
              {top3.map(result => (
                <div key={result.user_id} className="col-md-4">
                  <div
                    className={cn('card h-100 border-3 shadow-lg', {
                      'bg-dark border-warning': result.place === 1,
                      'bg-dark border-secondary': result.place === 2,
                      'bg-dark border-bronze': result.place === 3,
                    })}
                  >
                    <div className="card-body text-center">
                      <div className={cn('badge fs-3 mb-3', getPlaceBadgeClass(result.place))}>
                        {result.place === 1 && '🥇'}
                        {result.place === 2 && '🥈'}
                        {result.place === 3 && '🥉'}
                      </div>
                      <h4 className="card-title text-white mb-2">{result.user_name}</h4>
                      <div className="mb-3">
                        {result.user_lang && (
                          <span className="badge bg-dark me-2">{result.user_lang}</span>
                        )}
                        {result.clan_name && (
                          <span className="badge bg-info">{result.clan_name}</span>
                        )}
                      </div>
                      <div className="mt-4">
                        <div className="row g-3">
                          <div className="col-6">
                            <div className="text-muted small">Points</div>
                            <div className="text-white fw-bold fs-4">{result.total_points}</div>
                          </div>
                          <div className="col-6">
                            <div className="text-muted small">Wins</div>
                            <div className="text-white fw-bold fs-4">{result.total_wins_count}</div>
                          </div>
                          <div className="col-6">
                            <div className="text-muted small">Score</div>
                            <div className="text-white">{result.total_score}</div>
                          </div>
                          <div className="col-6">
                            <div className="text-muted small">Tournaments</div>
                            <div className="text-white">{result.tournaments_count}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light">
          <div className="card-body">
            <h2 className="card-title mb-4 text-white">Full Leaderboard</h2>

            {results.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted mb-0">No results yet</p>
              </div>
            ) : (
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
                      <th scope="col">Avg Place</th>
                      <th scope="col">Best Place</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(result => (
                      <tr key={result.user_id}>
                        <th scope="row">
                          <span className={cn('badge', getPlaceBadgeClass(result.place))}>
                            {result.place}
                          </span>
                        </th>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span>{result.user_name}</span>
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
                        <td>{result.avg_place ? Number(result.avg_place).toFixed(1) : '-'}</td>
                        <td>{result.best_place || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(SeasonShowPage);
