import React, { useContext } from 'react';

import hasIn from 'lodash/hasIn';
import { useSelector } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import { roomMachineStates, replayerMachineStates } from '../../machines/game';
import { roomStateSelector } from '../../machines/selectors';
import * as selectors from '../../selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';
import BackToTaskBuilderButton from '../builder/BackToTaskBuilderButton';

import ActionsAfterGame from './ActionsAfterGame';
import ApprovePlaybookButtons from './ApprovePlaybookButtons';
import BackToHomeButton from './BackToHomeButton';
import BackToTournamentButton from './BackToTournamentButton';
import GameResult from './GameResult';
import GoToNextGame from './GoToNextGame';
import ReplayerControlButton from './ReplayerControlButton';

function Notifications() {
  const { mainService } = useContext(RoomContext);
  const roomCurrent = useMachineStateSelector(mainService, roomStateSelector);

  const { tournamentId } = useSelector(selectors.gameStatusSelector);
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const players = useSelector(selectors.gamePlayersSelector);
  const playbookSolutionType = useSelector(state => state.playbook.solutionType);
  const tournamentsInfo = useSelector(state => state.game.tournamentsInfo);
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const isCurrentUserPlayer = hasIn(players, currentUserId);
  const isTournamentGame = !!tournamentId;
  const isActiveTournament = !!tournamentsInfo && tournamentsInfo.state === 'active';

  return (
    <>
      {roomCurrent.matches({ room: roomMachineStates.testing }) && <BackToTaskBuilderButton />}
      <ReplayerControlButton />
      {(isCurrentUserPlayer && roomCurrent.matches({ room: roomMachineStates.gameOver }))
        && (
          <>
            <GameResult />
            <ActionsAfterGame />
          </>
        )}
      {(isAdmin && !roomCurrent.matches({ replayer: replayerMachineStates.off })) && (
        <>
          <ApprovePlaybookButtons playbookSolutionType={playbookSolutionType} />
        </>
      )}
      {isTournamentGame && isActiveTournament
        && <GoToNextGame tournamentsInfo={tournamentsInfo} currentUserId={currentUserId} />}
      {isTournamentGame && <BackToTournamentButton />}
      {!isTournamentGame && !roomCurrent.matches({ room: roomMachineStates.testing })
        && <BackToHomeButton />}
    </>
  );
}

export default Notifications;
