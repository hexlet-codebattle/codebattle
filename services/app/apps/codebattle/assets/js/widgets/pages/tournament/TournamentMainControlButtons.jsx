/* eslint-disable */
import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';

// import * as selectors from '../../selectors';
import TournamentStates from '../../config/tournament';
import {
  cancelTournament as handleCancelTournament,
  startTournament as handleStartTournament,
  backTournament as handleBackTournament,
  openUpTournament as handleOpenUpTournament,
} from '../../middlewares/Tournament';

const TournamentMainControlButtons = ({ state }) => (
  <>
    {state !== TournamentStates.active && (
      <button className="btn btn-success ml-2" onClick={handleStartTournament}>
        Start
      </button>
    )}
    {state === TournamentStates.waitingParticipants && (
      <button className="btn btn-info ml-2" onClick={handleBackTournament}>
        Back
      </button>
    )}
    <button className="btn btn-danger ml-2" onClick={handleCancelTournament}>
      Cancel
    </button>
    {false && (
      <button className="btn btn-danger ml-2" onClick={handleOpenUpTournament}>
        Open Up
      </button>
    )}
  </>
);

export default memo(TournamentMainControlButtons);
