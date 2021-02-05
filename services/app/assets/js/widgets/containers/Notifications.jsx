import React from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import ActionsAfterGame from '../components/Toast/ActionsAfterGame';
import GameResult from './GameResult';
import BackToHomeButton from '../components/Toast/BackToHomeButton';
import GoToNextGame from '../components/Toast/GoToNextGame';
import BackToTournamentButton from '../components/Toast/BackToTournamentButton';
import * as selectors from '../selectors';
import GameTypeCodes from '../config/gameTypeCodes';
import GameContext from './GameContext';

const Notifications = () => {
  const gameType = useSelector(selectors.gameTypeSelector);
  const currentUserId = useSelector(state => selectors.currentUserIdSelector(state));
  const players = useSelector(state => selectors.gamePlayersSelector(state));
  const tournamentsInfo = useSelector(state => state.game.tournamentsInfo);
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);
  const { current } = useContext(GameContext);
  const isTournamentGame = gameType === GameTypeCodes.tournament;
  const isActiveTournament = !!tournamentsInfo && tournamentsInfo.state === 'active';

  return (
    <>
      {(isCurrentUserPlayer && current.matches('game_over'))
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
