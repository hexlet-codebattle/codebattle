import React, { useState, useEffect, useCallback } from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Flex, Paper } from '@mantine/core';
import { useActorRef } from '@xstate/react';
import { useDispatch, useSelector } from 'react-redux';

import { type RootState, type AppDispatch } from '@/slices';
import { connectToEditor, connectToGame, setGameChannel } from '@/middlewares/Room';
import { connectToSpectator } from '@/middlewares/Spectator';
import { connectToTournament } from '@/middlewares/Tournament';

import CountdownTimer from '../../components/CountdownTimer';
import EditorUserTypes from '../../config/editorUserTypes';
import GameStateCodes from '../../config/gameStateCodes';
import ModalCodes from '../../config/modalCodes';
// import MatchStatesCodes from '../../config/matchStates';
import TournamentStates from '../../config/tournament';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import useSearchParams from '../../utils/useSearchParams';
// import useMatchesStatistics from '../../utils/useMatchesStatistics';
// import Output from '../game/Output';
import OutputTab from '../game/OutputTab';
import { type OutputData } from '../game/Output';
import TaskAssignment, { type GameTask } from '../game/TaskAssignment';
import TournamentAwardModal from '../game/TournamentAwardModal';

import SpectatorEditor from './SpectatorEditor';

// const RoundStatus = ({ playerId, matches }) => {
//   const [
//     player,
//     opponent,
//   ] = useMatchesStatistics(playerId, matches);
//
//   const RoundStatistics = () => (
//     <div className="d-flex text-center align-items-center justify-content-center">
//       <div className="d-flex flex-column align-items-baseline">
//         <span className="ml-2 h4">
//           {'Wins: '}
//           {player.winMatches.length}
//         </span>
//         <span className="ml-2 h4">
//           {'Score: '}
//           {Math.ceil(player.score)}
//         </span>
//         <span className="ml-2 h4">
//           {`AVG Tests: ${Math.ceil(player.avgTests)}%`}
//         </span>
//         <span className="ml-4 h4">
//           {'AVG Duration: '}
//           {Math.ceil(player.avgDuration)}
//           {' sec'}
//         </span>
//       </div>
//     </div>
//   );
//
//   const RoundResultIcon = () => {
//     if (
//       player.winMatches.length === opponent.winMatches.length
//       && player.score === opponent.score
//       && player.avgTests === opponent.avgTests
//       && player.avgDuration === opponent.avgDuration
//     ) {
//       return <FontAwesomeIcon className="ml-2 text-primary" icon="handshake" />;
//     }
//
//     if (
//       player.score > opponent.score
//       || (player.score === opponent.score
//         && player.winMatches.length > opponent.winMatches.length)
//       || (player.winMatches.length === opponent.winMatches.length
//         && player.score === opponent.score
//         && player.avgTests > opponent.avgTests)
//       || (player.winMatches.length === opponent.winMatches.length
//         && player.score === opponent.score
//         && player.avgTests === opponent.avgTests
//         && player.avgDuration > opponent.avgDuration)
//     ) {
//       return <FontAwesomeIcon className="ml-2 text-warning" icon="trophy" />;
//     }
//
//     return <FontAwesomeIcon className="ml-2 text-secondary" icon="trophy" />;
//   };
//
//   return (
//     <div className="d-flex">
//       <div className="d-flex justify-content-center align-items-center h1">
//         <RoundResultIcon />
//       </div>
//       <RoundStatistics />
//     </div>
//   );
// };

// const getMatchIcon = (playerId, match) => {
//   if (
//     match.state === MatchStatesCodes.timeout
//     || match.state === MatchStatesCodes.canceled
//   ) {
//     return <FontAwesomeIcon className="text-dark" icon="stopwatch" />;
//   }
//
//   if (playerId === match.winnerId) {
//     return <FontAwesomeIcon className="text-warning" icon="trophy" />;
//   }
//
//   if (playerId !== match.winnerId) {
//     return <FontAwesomeIcon className="text-muted" icon="trophy" />;
//   }
//
//   return <FontAwesomeIcon className="text-danger" icon="times" />;
// };

const getSpectatorStatus = (state: string, task: unknown, gameId: number | null) => {
  switch (state) {
    case TournamentStates.finished:
      return 'Tournament is finished';
    case TournamentStates.waitingParticipants:
      return 'Tournament is waiting to start';
    case TournamentStates.canceled:
      return 'Tournament is canceled';
    default:
      break;
  }

  if (!task || !gameId) {
    return 'Game is loading';
  }

  return '';
};

const taskSizeDefault = Number(window.localStorage.getItem('CodebattleSpectatorTaskSize') || '0');
const setTaskSizeDefault = (size: number) =>
  window.localStorage.setItem('CodebattleSpectatorTaskSize', String(size));

interface GamePanelProps {
  spectatorStatus: string;
  task: unknown;
  taskSize: number;
  taskLanguage: string;
  handleSetLanguage: (lang: string) => () => void;
  changeTaskDescriptionSizes: (size: number) => void;
  hidingControls: boolean;
  output: unknown;
}

function GamePanel({
  spectatorStatus,
  task,
  taskSize,
  taskLanguage,
  handleSetLanguage,
  changeTaskDescriptionSizes,
  hidingControls,
  output,
}: GamePanelProps) {
  return !spectatorStatus ? (
    <>
      <Paper shadow="sm" radius="md" bg="transparent">
        <TaskAssignment
          task={task as GameTask}
          taskSize={taskSize}
          taskLanguage={taskLanguage}
          handleSetLanguage={handleSetLanguage}
          changeTaskDescriptionSizes={changeTaskDescriptionSizes}
          hideContribution
          hidingControls={hidingControls}
          fullSize
        />
      </Paper>
      <Paper className="cb-overflow-y-auto" shadow="sm" radius="md" bg="transparent" mt={4}>
        <Flex justify="space-around" align="center" w="100%" p="sm">
          <OutputTab sideOutput={output as OutputData} large />
        </Flex>
      </Paper>
    </>
  ) : (
    <Paper radius="md" bg="transparent" w="100%">
      <Flex justify="center" align="center" w="100%">
        {spectatorStatus}
      </Flex>
    </Paper>
  );
}

interface TournamentPlayerProps {
  // xstate v4 machine; typed loosely per migration conventions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spectatorMachine: any;
}

function TournamentPlayer({ spectatorMachine }: TournamentPlayerProps) {
  const dispatch = useDispatch<AppDispatch>();

  const searchParams = useSearchParams();

  const [hidingControls, setHidingControls] = useState(false);
  const [switchedWidgetsStatus, setSwitchedWidgetsStatus] = useState(false);
  const [taskSize, setTaskSize] = useState(taskSizeDefault);

  const activeEditorMode = searchParams.has('editor');
  const activeTimerMode = searchParams.has('timer');

  const changeTaskDescriptionSizes = useCallback(
    (size: number) => {
      setTaskSize(size);
      setTaskSizeDefault(size);
    },
    [setTaskSize],
  );

  const {
    startsAt,
    timeoutSeconds,
    state: gameState,
    // solutionStatus,
  } = useSelector(selectors.gameStatusSelector);

  const tournament = useSelector(selectors.tournamentSelector);
  const task = useSelector(selectors.gameTaskSelector);
  const taskLanguage = useSelector(selectors.taskDescriptionLanguageSelector);
  const { playerId, gameId } = useSelector((state: RootState) => state.tournamentPlayer);

  const output = useSelector(selectors.executionOutputSelector(playerId as number, undefined));

  const spectatorStatus = getSpectatorStatus(tournament.state, task, gameId);
  // TODO: if there is not active_match set html, LOADING
  //
  const context = {
    userId: playerId,
    type: EditorUserTypes.player,
  };
  // xstate v5: per-instance implementations via `.provide(...)`; seed context via `input`.
  const spectatorService = useActorRef(
    spectatorMachine.provide({
      actions: {
        // machine is loosely typed; event args are untyped here.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blockGameRoomAfterCheck: ({ event }: any) => {
          if (event.payload?.award) {
            NiceModal.show(ModalCodes.awardModal, { onlyShowAward: true });
          }
        },
      },
    }),
    { input: context },
  );
  const handleSwitchWidgets = useCallback(
    () => setSwitchedWidgetsStatus((state) => !state),
    [setSwitchedWidgetsStatus],
  );
  const handleSwitchHidingControls = useCallback(() => {
    setHidingControls((state) => !state);
  }, [setHidingControls]);

  const handleSetLanguage = (lang: string) => () =>
    dispatch(actions.setTaskDescriptionLanguage(lang));

  useEffect(() => {
    NiceModal.register(ModalCodes.awardModal, TournamentAwardModal);

    return () => {
      unregister(ModalCodes.awardModal);
    };
  }, []);

  useEffect(() => {
    NiceModal.hide(ModalCodes.awardModal);
  }, [gameId]);

  useEffect(() => {
    // updateSpectatorChannel(playerId);

    if (playerId) {
      // connectToSpectator returns a cleanup callback (typed loosely upstream).
      const clearSpectatorChannel = connectToSpectator()(dispatch) as unknown as () => void;

      return () => {
        clearSpectatorChannel();
      };
    }

    return () => {};
  }, [playerId, dispatch]);

  useEffect(() => {
    if (tournament.id) {
      const channel = dispatch(connectToTournament(tournament.id));

      return () => {
        channel.leave();
      };
    }

    return () => {};
  }, [tournament.id, dispatch]);

  useEffect(() => {
    const channel = setGameChannel(gameId ?? undefined);

    if (gameId) {
      NiceModal.hide(ModalCodes.awardModal);
      const options = { cancelRedirect: true };

      connectToGame(spectatorService, options)(dispatch);
      // connectToEditor's typed signature differs from this legacy call; preserve runtime.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (connectToEditor as any)(spectatorService, options)(dispatch);

      return () => {
        if (channel) {
          channel.leave();
        }
      };
    }

    return () => {};
  }, [gameId, spectatorService, dispatch]);

  // Layout note: the row/row-reverse widget swap is commented out upstream
  // (`switchedWidgetsStatus`), so the panel stacks in a single column.

  // const MatchesPannel = () => {
  //   const groupedMatches = groupBy(Object.values(tournament.matches), 'round');
  //   const rounds = reverse(Object.keys(groupedMatches));
  //
  //   const lastRound = rounds[0];
  //
  //   if (!lastRound || !groupedMatches[lastRound]) {
  //     return (
  //       <div className="card cb-card rounded-lg flex justify-content-center align-items-center w-100 h-100">
  //         No statistics
  //       </div>
  //     );
  //   }
  //
  //   return (
  //     <div className="card border-0 rounded-lg shadow-sm h-100">
  //       <div className="p-2 d-flex h-100 w-100">
  //         <div className="d-flex flex-column w-100 overflow-auto">
  //           <h2 className="mb-4">Round Statistics:</h2>
  //           <div className="mt-2">
  //             <RoundStatus
  //               playerId={playerId}
  //               matches={groupedMatches[lastRound]}
  //             />
  //           </div>
  //
  //           <h2 className="mb-4 mt-2 border-top">Matches:</h2>
  //           <div>
  //             {groupedMatches[lastRound].map(match => (
  //               <div
  //                 className="d-flex text-center align-items-center"
  //                 key={match.id}
  //               >
  //                 <span className="h3">{getMatchIcon(playerId, match)}</span>
  //                 {match.playerResults[playerId] ? (
  //                   <div className="d-flex flex-column align-items-baseline">
  //                     <span className="ml-4 h4">
  //                       {'Duration: '}
  //                       {match.playerResults[playerId].durationSec}
  //                       {' sec'}
  //                     </span>
  //                     <span className="ml-2 h4">
  //                       {'Score: '}
  //                       {match.playerResults[playerId].score}
  //                     </span>
  //                     <span className="ml-2 h4">
  //                       {`Tests: ${match.playerResults[playerId].resultPercent}%`}
  //                     </span>
  //                   </div>
  //                 ) : (
  //                   <span className="ml-4 h3">¯\_(ツ)_/¯</span>
  //                 )}
  //               </div>
  //             ))}
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // };

  if (activeEditorMode) {
    return (
      <SpectatorEditor
        panelClassName="spectator"
        style={{ overflow: 'hidden' }}
        switchedWidgetsStatus={switchedWidgetsStatus}
        handleSwitchWidgets={handleSwitchWidgets}
        hidingControls={hidingControls}
        handleSwitchHidingControls={handleSwitchHidingControls}
        spectatorService={spectatorService}
        playerId={playerId}
      />
    );
  }

  if (activeTimerMode) {
    return (
      <>
        {startsAt && gameState === GameStateCodes.playing && (
          <CountdownTimer time={startsAt} timeoutSeconds={timeoutSeconds as number} />
        )}
      </>
    );
  }

  return (
    <Box w="100%" px="md">
      <Flex direction="column" h="100vh">
        <Flex direction="column" p="xs">
          <GamePanel
            spectatorStatus={spectatorStatus}
            task={task}
            taskSize={taskSize}
            taskLanguage={taskLanguage}
            handleSetLanguage={handleSetLanguage}
            changeTaskDescriptionSizes={changeTaskDescriptionSizes}
            hidingControls={hidingControls}
            output={output}
          />
          {/* <MatchesPannel /> */}
        </Flex>
        <SpectatorEditor
          panelClassName="spectator"
          switchedWidgetsStatus={switchedWidgetsStatus}
          handleSwitchWidgets={handleSwitchWidgets}
          hidingControls={hidingControls}
          handleSwitchHidingControls={handleSwitchHidingControls}
          spectatorService={spectatorService}
          playerId={playerId}
        />
      </Flex>
    </Box>
  );
}

export default TournamentPlayer;
