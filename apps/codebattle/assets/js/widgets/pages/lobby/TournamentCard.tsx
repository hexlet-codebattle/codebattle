import React from 'react';

import moment from 'moment';

import i18n from '../../../i18n';
import TournamentType from '../../components/TournamentType';
// import UserInfo from '../../components/UserInfo';

import ShowButton from './ShowButton';

export interface LobbyTournament {
  id: number;
  name: string;
  type?: string;
  grade?: string;
  state?: string;
  startsAt?: string;
  finishedAt?: string;
  lastRoundEndedAt?: string;
  playersCount?: number;
  [key: string]: unknown;
}

interface TournamentCardProps {
  tournament: LobbyTournament;
  type?: string;
}

function TournamentCard({ tournament }: TournamentCardProps) {
  return (
    <div className="d-flex flex-column shadow-sm p-2 mb-2 mx-2 bg-white border rounded-lg">
      <div className="d-flex flex-column mb-2 h-100">
        <h4 className="p-1 text-nowrap">{tournament.name}</h4>
        <h5 className="p-1 text-nowrap">
          {i18n.t('Mode:')} <TournamentType type={tournament.type ?? ''} />
          {` ${tournament.type}`}
        </h5>
        <span className="p-1 text-nowrap">
          {i18n.t('Starts at %{date}', {
            date: moment.utc(tournament.startsAt).local().locale(i18n.language).format('LLL'),
          })}
        </span>
        {/* <span className="d-flex p-1 text-nowrap"> */}
        {/*   <span className="mr-2">Creator:</span> */}
        {/*   <UserInfo user={tournament.creator} /> */}
        {/* </span> */}
        <div className="d-flex flex-column cb-vw-75">
          <ShowButton url={`/tournaments/${tournament.id}/`} />
        </div>
      </div>
    </div>
  );
}

export default TournamentCard;
