import { useSelector } from 'react-redux';

import BattleRoomViewModesCodes from '../config/battleRoomViewModes';
import GameStateCodes from '../config/gameStateCodes';
import GameTypeCodes from '../config/gameTypeCodes';
import * as machineSelectors from '../machines/selectors';
import * as selectors from '../selectors';

const mapGameTypeOnViewMode = {
  [GameTypeCodes.duo]: BattleRoomViewModesCodes.duel,
  [GameTypeCodes.solo]: BattleRoomViewModesCodes.single,
};

// roomMachineState is an xstate machine state snapshot passed to
// machineSelectors, which expose no shared type — hence the localized any.
const useRoomSettings = (_pageName: string, roomMachineState: any) => {
  const gameStatus = useSelector(selectors.gameStatusSelector);

  const firstPlayer = useSelector(selectors.firstPlayerSelector);
  const secondPlayer = useSelector(selectors.secondPlayerSelector);
  const locked = useSelector(selectors.gameLockedSelector);
  const visible = useSelector(selectors.gameVisibleSelector);

  const inWaitingOpponent = machineSelectors.inWaitingOpponentStateSelector(roomMachineState);
  const replayerIsOpen = machineSelectors.openedReplayerSelector(roomMachineState);

  const tournamentId = gameStatus?.tournamentId;

  const showWaitingOpponent =
    inWaitingOpponent || gameStatus.state === GameStateCodes.waitingOpponent;
  const showBattleRoom = true;
  const showTimeoutMessage =
    gameStatus.state === GameStateCodes.timeout && !(firstPlayer && secondPlayer);

  return {
    tournamentId,
    viewMode:
      mapGameTypeOnViewMode[gameStatus.type as keyof typeof mapGameTypeOnViewMode] ||
      BattleRoomViewModesCodes.duel,
    showWaitingOpponent,
    showBattleRoom,
    showTimeoutMessage,
    showReplayer: replayerIsOpen,
    roomLocked: locked,
    visible,
  };
};

export default useRoomSettings;
