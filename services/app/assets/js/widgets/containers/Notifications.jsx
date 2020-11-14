import React from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import ActionsAfterGame from '../components/Toast/ActionsAfterGame';
import GameResult from './GameResult';
import BackToHomeButton from '../components/Toast/BackToHomeButton';
import GoToNextGame from '../components/Toast/GoToNextGame';
import BackToTournamentButton from '../components/Toast/BackToTournamentButton';
import * as selectors from '../selectors';
import GameStatusCodes from '../config/gameStatusCodes';
import GameTypeCodes from '../config/gameTypeCodes';

const Notifications = () => {
  const gameType = useSelector(selectors.gameTypeSelector);
  const currentUserId = useSelector(state => selectors.currentUserIdSelector(state));
  const players = useSelector(state => selectors.gamePlayersSelector(state));
  const tournamentsInfo = useSelector(state => state.game.tournamentsInfo);
  const { status } = useSelector(state => selectors.gameStatusSelector(state));
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);
  const isGameNotPlaying = status !== GameStatusCodes.playing;
  const isTournamentGame = gameType === GameTypeCodes.tournament;
  const isActiveTournament = tournamentsInfo !== null && tournamentsInfo.state === 'active';

  return (
    <>
      {(isCurrentUserPlayer && isGameNotPlaying)
        && (
          <>
            <GameResult />
            <ActionsAfterGame />
          </>
      )}
      { isTournamentGame && isActiveTournament
        && <GoToNextGame info={tournamentsInfo} currentUserId={currentUserId} /> }
      { isTournamentGame && <BackToTournamentButton /> }
      { !isTournamentGame && <BackToHomeButton />}
    </>
);
};

export default Notifications;
