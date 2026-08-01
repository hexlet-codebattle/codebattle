import React, { useMemo } from 'react';

import isEmpty from 'lodash/isEmpty';
import orderBy from 'lodash/orderBy';
import moment from 'moment';

import i18n from '../../../i18n';
import HorizontalScrollControls from '../../components/SideScrollControls';

import ShowButton from './ShowButton';
import TournamentCard, { type LobbyTournament } from './TournamentCard';

interface CompletedTournamentsProps {
  tournaments?: LobbyTournament[];
}

function CompletedTournaments({ tournaments = [] }: CompletedTournamentsProps) {
  const sortedTournaments = useMemo(() => orderBy(tournaments, 'startsAt', 'desc'), [tournaments]);

  if (isEmpty(tournaments)) {
    return null;
  }

  return (
    <div className="table-responsive">
      <h2 className="text-center mt-3">{i18n.t('Completed tournaments')}</h2>
      <div className="d-none d-md-block table-responsive rounded-bottom">
        <table className="table table-striped">
          <thead className="">
            <tr>
              <th className="p-3 border-0">{i18n.t('Title')}</th>
              <th className="p-3 border-0">{i18n.t('Type')}</th>
              <th className="p-3 border-0">{i18n.t('Starts at')}</th>
              <th className="p-3 border-0">{i18n.t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="">
            {sortedTournaments.map((tournament) => (
              <tr key={tournament.id}>
                <td className="p-3 align-middle">{tournament.name}</td>
                <td className="p-3 align-middle">{tournament.type}</td>
                <td className="p-3 align-middle text-nowrap">
                  {moment.utc(tournament.startsAt).local().format('YYYY-MM-DD HH:mm')}
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
        {sortedTournaments.map((tournament) => (
          <TournamentCard key={`card-${tournament.id}`} type="completed" tournament={tournament} />
        ))}
      </HorizontalScrollControls>
    </div>
  );
}

export default CompletedTournaments;
