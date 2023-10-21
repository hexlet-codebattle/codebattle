import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import TournamentStates from '../../config/tournament';
import { connectToTournamentPlayer } from '../../middlewares/TournamentPlayer';
import * as selectors from '../../selectors';

import CustomMatchesPanel from './CustomMatchesPanel';
import IndividualMatches from './IndividualMatches';
import Players from './Participants';
import TeamMatches from './TeamMatches';
import TournamentHeader from './TournamentHeader';

function TournamentPlayer() {
  const dispatch = useDispatch();

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const tournament = useSelector(selectors.tournamentSelector);

  if (tournament.state === TournamentStates.waitingParticipants) {
    return (
      <>
        <span className="d-flex justify-content-center align-items-center h-100">Tournament is not started yet</span>
      </>
    );
  }

  useEffect(() => {
    if (tournament.isLive) {
      const tournamentPlayer = connectToTournamentPlayer()(dispatch);

      return () => {
        tournamentPlayer();
      };
    }

    return () => { };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="container-fluid">
        <div className="row flex-lg-row-reverse">
          <div className="col-12 col-lg-9 mb-2 mb-lg-0">
            <div className="bg-white h-100 shadow-sm rounded-lg p-3 overflow-auto">
              <h1>Implement Tournament Player follow game view, pls</h1>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TournamentPlayer;
