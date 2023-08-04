import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import ReplayerControlButton from './ReplayerControlButton';
import ActionsAfterGame from './ActionsAfterGame';
import GameResult from './GameResult';
import BackToHomeButton from './BackToHomeButton';
import GoToNextGame from './GoToNextGame';
import BackToTournamentButton from './BackToTournamentButton';
import BackToTaskBuilderButton from '../builder/BackToTaskBuilderButton';
import * as selectors from '../../selectors';
import RoomContext from '../../components/RoomContext';
import { roomMachineStates, replayerMachineStates } from '../../machines/game';
import ApprovePlaybookButtons from './ApprovePlaybookButtons';
import { roomStateSelector } from '../../machines/selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

const Notifications = () => {
  const { mainService } = useContext(RoomContext);
  const roomCurrent = useMachineStateSelector(mainService, roomStateSelector);

  const { tournamentId } = useSelector(selectors.gameStatusSelector);
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const players = useSelector(selectors.gamePlayersSelector);
  const playbookSolutionType = useSelector(state => state.playbook.solutionType);
  const tournamentsInfo = useSelector(state => state.game.tournamentsInfo);
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);
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
};

export default Notifications;
