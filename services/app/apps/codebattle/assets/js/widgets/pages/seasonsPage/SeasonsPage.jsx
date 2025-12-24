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

const SeasonsPage = () => {
  const seasons = (Gon && Gon.getAsset && Gon.getAsset('seasons')) || [];

  return (
    <div className="cb-bg-panel cb-text min-vh-100 py-5">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mb-5">
          <h1 className="text-white fw-bold">Seasons</h1>
          <a href="/hall_of_fame" className="btn btn-outline-light">
            Hall of Fame
          </a>
        </div>

        {seasons.length === 0 ? (
          <div className="card cb-bg-panel cb-border-color cb-rounded shadow-sm border-0 text-light">
            <div className="card-body text-center py-5">
              <p className="text-muted mb-0">No seasons found</p>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {seasons.map(season => (
              <div key={season.id} className="col-lg-6">
                <div
                  className="card cb-bg-panel cb-border-color cb-rounded shadow-lg border-0 text-light h-100"
                  style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                  }}
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h3 className="card-title text-warning mb-1">
                          {season.name}
                          {' '}
                          {season.year}
                        </h3>
                        <div className="text-muted small">
                          {season.starts_at}
                          {' '}
                          -
                          {' '}
                          {season.ends_at}
                        </div>
                      </div>
                      <a
                        href={`/seasons/${season.id}`}
                        className="btn btn-sm btn-outline-warning"
                      >
                        View Results
                      </a>
                    </div>

                    {season.top3 && season.top3.length > 0 ? (
                      <div>
                        <h5 className="text-white mb-3 small">Top 3</h5>
                        <div className="d-flex flex-column gap-2">
                          {season.top3.map(result => (
                            <div
                              key={result.user_id}
                              className={cn('card border-2', {
                                'bg-dark border-warning': result.place === 1,
                                'bg-dark border-secondary': result.place === 2,
                                'bg-dark border-bronze': result.place === 3,
                              })}
                            >
                              <div className="card-body py-2 px-3">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className={cn('badge', getPlaceBadgeClass(result.place))}>
                                      {result.place === 1 && '🥇'}
                                      {result.place === 2 && '🥈'}
                                      {result.place === 3 && '🥉'}
                                    </span>
                                    <div>
                                      <div className="text-white fw-bold">{result.user_name}</div>
                                      {result.clan_name && (
                                        <div className="text-muted small">
                                          <span className="badge bg-info">{result.clan_name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-end">
                                    <div className="text-white fw-bold">{result.total_points}</div>
                                    <div className="text-muted small">points</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted text-center py-3 small">
                        No results yet
                      </div>
                    )}
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

export default memo(SeasonsPage);
