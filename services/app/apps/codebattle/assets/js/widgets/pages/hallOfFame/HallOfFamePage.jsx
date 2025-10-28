import React, { useMemo } from 'react';

import cn from 'classnames';
import Gon from 'gon';

const HallOfFamePage = () => {
  const data = useMemo(
    () => ({
      currentSeason:
        (Gon && Gon.getAsset && Gon.getAsset('current_season')) || null,
      top10: (Gon && Gon.getAsset && Gon.getAsset('top10')) || [],
    }),
    [],
  );

  const { currentSeason, top10 } = data;

  return (
    <div className="cb-bg-panel cb-text min-vh-100 py-5 d-flex flex-column align-items-center">
      <div className="container">
        <h1 className="text-center text-white mb-5 fw-bold">Hall of Fame</h1>

        {currentSeason && (
          <div
            className={cn(
              'card mb-5 cb-bg-panel cb-border-color cb-rounded shadow-sm',
              'border-0 text-light',
            )}
          >
            <div className="card-body">
              <h2 className="card-title mb-4 text-white">Current Season</h2>

              <div className="row mb-2">
                <div className="col-md-6">
                  <p>
                    <strong>Season:</strong>
                    {' '}
                    {currentSeason.name || 'N/A'}
                  </p>
                </div>
                <div className="col-md-6">
                  <p>
                    <strong>Year:</strong>
                    {' '}
                    {currentSeason.year || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <p>
                    <strong>Starts:</strong>
                    {' '}
                    {currentSeason.starts_at || 'N/A'}
                  </p>
                </div>
                <div className="col-md-6">
                  <p>
                    <strong>Ends:</strong>
                    {' '}
                    {currentSeason.ends_at || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            'card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light',
          )}
        >
          <div className="card-body">
            <h2 className="card-title mb-4 text-white">Top 10 Leaderboard</h2>

            <div className="table-responsive">
              <table className="table table-dark table-striped table-hover mb-0 cb-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Player</th>
                    <th scope="col">Rank</th>
                    <th scope="col">Points</th>
                    <th scope="col">Rating</th>
                    <th scope="col">Clan</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.length > 0 ? (
                    top10.map((user, index) => (
                      <tr key={user.id || index}>
                        <th scope="row">{index + 1}</th>
                        <td>
                          <div className="d-flex align-items-center">
                            {user.avatar_url && (
                              <img
                                src={user.avatar_url}
                                alt={user.name}
                                className="rounded-circle me-2"
                                style={{ width: '32px', height: '32px' }}
                              />
                            )}
                            <span>
                              {user.name}
                              {user.is_bot && (
                                <span className="badge bg-info ms-2">BOT</span>
                              )}
                              {user.is_guest && (
                                <span className="badge bg-warning ms-2">
                                  GUEST
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td>{user.rank || '-'}</td>
                        <td>{user.points || 0}</td>
                        <td>{user.rating || 0}</td>
                        <td>{user.clan || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center">
                        No players found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HallOfFamePage;
