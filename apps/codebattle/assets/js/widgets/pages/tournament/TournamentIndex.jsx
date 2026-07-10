import React from 'react';

import { camelizeKeys } from 'humps';
import PropTypes from 'prop-types';

import CreateTournament from './CreateTournament';

const formatStartsAt = (value, userTimezone) => {
  if (!value) {
    return 'none';
  }

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: userTimezone || 'UTC',
    timeZoneName: 'short',
  };

  try {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
  } catch (_error) {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(
      new Date(value),
    );
  }
};

function TournamentsTable({ tournaments, userTimezone }) {
  return (
    <div className="container-xl cb-bg-panel cb-text shadow-sm cb-rounded py-4 mb-3">
      <h1 className="text-center">Tournaments</h1>
      <div className="table-responsive mt-4">
        <table className="table table-sm">
          <thead className="cb-text">
            <tr>
              <th className="cb-border-color border-bottom-0">name</th>
              <th className="cb-border-color border-bottom-0">type</th>
              <th className="cb-border-color border-bottom-0">level</th>
              <th className="cb-border-color border-bottom-0">state</th>
              <th className="cb-border-color border-bottom-0">starts_at</th>
              <th className="cb-border-color border-bottom-0">actions</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((tournament) => (
              <tr key={tournament.id}>
                <td className="align-middle text-white cb-border-color">{tournament.name}</td>
                <td className="align-middle text-nowrap text-white cb-border-color">
                  {tournament.type}
                </td>
                <td
                  className="align-middle text-nowrap cb-border-color"
                  aria-label={`Level: ${tournament.level}`}
                >
                  <div className="d-flex">
                    <div className="bg-gray p-1 m-1 cb-rounded">
                      <img
                        alt={tournament.level}
                        src={`/assets/images/levels/${tournament.level}.svg`}
                      />
                    </div>
                  </div>
                </td>
                <td className="align-middle text-nowrap text-white cb-border-color">
                  {tournament.state}
                </td>
                <td className="align-middle text-nowrap text-white cb-border-color">
                  {formatStartsAt(tournament.startsAt, userTimezone)}
                </td>
                <td className="align-middle text-nowrap text-white cb-border-color">
                  <a
                    href={`/tournaments/${tournament.id}`}
                    className="btn btn-success cb-btn-success cb-rounded mt-2"
                  >
                    Show
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TournamentIndex({ tournaments = [], taskPackNames = [], userTimezone = 'UTC' }) {
  return (
    <>
      <TournamentsTable tournaments={tournaments} userTimezone={userTimezone} />
      <CreateTournament
        taskPackNames={taskPackNames}
        userTimezone={userTimezone}
        onSuccess={(tournament) => {
          window.location.href = `/tournaments/${tournament.id}`;
        }}
      />
    </>
  );
}

TournamentsTable.propTypes = {
  tournaments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string,
      type: PropTypes.string,
      level: PropTypes.string,
      state: PropTypes.string,
      startsAt: PropTypes.string,
    }),
  ),
  userTimezone: PropTypes.string,
};

TournamentsTable.defaultProps = {
  tournaments: [],
  userTimezone: 'UTC',
};

TournamentIndex.propTypes = {
  tournaments: PropTypes.arrayOf(PropTypes.shape({})),
  taskPackNames: PropTypes.arrayOf(PropTypes.string),
  userTimezone: PropTypes.string,
};

TournamentIndex.defaultProps = {
  tournaments: [],
  taskPackNames: [],
  userTimezone: 'UTC',
};

export const readTournamentIndexProps = (container) => ({
  tournaments: camelizeKeys(JSON.parse(container?.dataset?.tournaments || '[]')),
  taskPackNames: JSON.parse(container?.dataset?.taskPackNames || '[]'),
  userTimezone: container?.dataset?.userTimezone || 'UTC',
});

export default TournamentIndex;
