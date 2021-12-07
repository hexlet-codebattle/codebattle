import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import ReplayerControlButton from '../components/Toast/ReplayerControlButton';
import ActionsAfterGame from '../components/Toast/ActionsAfterGame';
import GameResult from './GameResult';
import BackToHomeButton from '../components/Toast/BackToHomeButton';
import GoToNextGame from '../components/Toast/GoToNextGame';
import BackToTournamentButton from '../components/Toast/BackToTournamentButton';
import * as selectors from '../selectors';
import GameContext from './GameContext';
import { gameMachineStates, replayerMachineStates } from '../machines/game';
import ApprovePlaybookButtons from '../components/ApprovePlaybookButtons';

const Notifications = () => {
  const { tournamentId } = useSelector(selectors.gameStatusSelector);
  const currentUserId = useSelector(state => selectors.currentUserIdSelector(state));
  const players = useSelector(state => selectors.gamePlayersSelector(state));
  const playbookSolutionType = useSelector(state => state.playbook.solutionType);
  const tournamentsInfo = useSelector(state => state.game.tournamentsInfo);
  const isAdmin = useSelector(state => state.userSettings.is_admin);
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);
  const { current } = useContext(GameContext);
  const isTournamentGame = tournamentId;
  const isActiveTournament = !!tournamentsInfo && tournamentsInfo.state === 'active';

  return (
    <>
      <ReplayerControlButton />
      {(isCurrentUserPlayer && current.matches({ game: gameMachineStates.gameOver }))
        && (
          <>
            <GameResult />
            <ActionsAfterGame />
          </>
      )}
      {(isAdmin && !current.matches({ replayer: replayerMachineStates.off })) && (
        <>
          <ApprovePlaybookButtons playbookSolutionType={playbookSolutionType} />
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
