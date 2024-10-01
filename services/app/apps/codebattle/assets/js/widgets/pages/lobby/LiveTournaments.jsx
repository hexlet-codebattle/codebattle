import React, { useMemo } from 'react';

import isEmpty from 'lodash/isEmpty';
import orderBy from 'lodash/orderBy';
import moment from 'moment';

import HorizontalScrollControls from '../../components/SideScrollControls';

import ShowButton from './ShowButton';
import TournamentCard from './TournamentCard';

const LiveTournaments = ({ tournaments = [] }) => {
  const sortedTournaments = useMemo(() => orderBy(tournaments, 'startsAt', 'desc'), [tournaments]);

  if (isEmpty(tournaments)) {
    return (
      <div className="d-flex flex-column text-center">
        <span className="mb-0 mt-3 p-3 text-muted">
          There are no active tournaments right now
        </span>
        <a className="text-primary" href="/tournaments/#create">
          <u>You may want to create one</u>
        </a>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <h2 className="text-center mt-3">Live tournaments</h2>
      <div className="d-none d-md-block table-responsive rounded-bottom">
        <table className="table table-striped">
          <thead className="">
            <tr>
              <th className="p-3 border-0">Title</th>
              <th className="p-3 border-0">Starts_at</th>
              <th className="p-3 border-0">Actions</th>
            </tr>
          </thead>
          <tbody className="">
            {sortedTournaments.map(tournament => (
              <tr key={tournament.id}>
                <td className="p-3 align-middle">{tournament.name}</td>
                <td className="p-3 align-middle text-nowrap">
                  {moment
                    .utc(tournament.startsAt)
                    .local()
                    .format('YYYY-MM-DD HH:mm')}
                </td>
                <td className="p-3 align-middle">
                  <ShowButton url={`/tournaments/${tournament.id}/`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <HorizontalScrollControls className="d-md-none m-2">
        {sortedTournaments.map(tournament => (
          <TournamentCard
            key={`card-${tournament.id}`}
            type="active"
            tournament={tournament}
          />
        ))}
      </HorizontalScrollControls>
      <div className="text-center mt-3">
        <a href="/tournaments">
          <u>Tournaments Info</u>
        </a>
      </div>
    </div>
  );
};

export default LiveTournaments;
