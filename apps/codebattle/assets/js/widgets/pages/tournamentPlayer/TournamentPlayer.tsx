import React, { useState, useEffect, useCallback } from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';
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
import TournamentStates from '../../config/tournament';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import useSearchParams from '../../utils/useSearchParams';
import OutputTab from '../game/OutputTab';
import { type OutputData } from '../game/Output';
import TaskAssignment, { type GameTask } from '../game/TaskAssignment';
import TournamentAwardModal from '../game/TournamentAwardModal';

import SpectatorEditor from './SpectatorEditor';

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

  const { startsAt, timeoutSeconds, state: gameState } = useSelector(selectors.gameStatusSelector);

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
