import React from 'react';

import { camelizeKeys } from 'humps';

import CreateTournament from './CreateTournament';
import { getBrowserTimezone } from './dateTime';

interface TournamentRow {
  id: number;
  name?: string;
  type?: string;
  level?: string;
  state?: string;
  startsAt?: string;
}

const formatStartsAt = (value: string | undefined, userTimezone?: string) => {
  if (!value) {
    return 'none';
  }

  const options: Intl.DateTimeFormatOptions = {
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

interface TournamentsTableProps {
  tournaments?: TournamentRow[];
  userTimezone?: string;
}

function TournamentsTable({ tournaments = [], userTimezone = 'UTC' }: TournamentsTableProps) {
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

export interface TournamentIndexProps {
  tournaments?: TournamentRow[];
  taskPackNames?: string[];
  userTimezone?: string;
}

function TournamentIndex({
  tournaments: rawTournaments = [],
  taskPackNames = [],
  userTimezone = 'UTC',
}: TournamentIndexProps) {
  const tournaments = camelizeKeys(rawTournaments) as TournamentRow[];
  const browserTimezone = getBrowserTimezone(userTimezone);

  return (
    <>
      <TournamentsTable tournaments={tournaments} userTimezone={browserTimezone} />
      <CreateTournament
        taskPackNames={taskPackNames}
        userTimezone={browserTimezone}
        onSuccess={(tournament) => {
          window.location.href = `/tournaments/${tournament.id}`;
        }}
      />
    </>
  );
}

export default TournamentIndex;
