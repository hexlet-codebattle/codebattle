/* eslint-disable */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { actions } from '../../slices';
import { type AppDispatch, type RootState } from '@/slices/store';

import { connectToActiveMatch, connectToStairwayTournament } from '../../middlewares/StairwayGame';

// import ChatWidget from './ChatWidget';
import StairwayGameInfo from './StairwayGameInfo';
import StairwayOutputTab from './StairwayOutputTab';
import StairwayEditorContainer from './StairwayEditorContainer';
import StairwayEditorToolbar from './StairwayEditorToolbar';
import Loading from '../../components/Loading';
// import StairwayRounds from './StairwayRounds';

interface StairwayMatch {
  roundId: number;
  players: Array<{ id: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface StairwayTournamentSlice {
  tournament?: {
    meta?: { tasks?: unknown; currentTaskId?: unknown; [key: string]: unknown };
    data?: { matches?: StairwayMatch[]; players?: unknown };
    [key: string]: unknown;
  };
  activeMatch?: StairwayMatch;
  [key: string]: unknown;
}

function StairwayGameContainer() {
  const dispatch = useDispatch<AppDispatch>();

  const meta = useSelector(
    (state: RootState) => (state.tournament as StairwayTournamentSlice)?.tournament?.meta,
  );
  const activeMatch = useSelector(
    (state: RootState) => (state.tournament as StairwayTournamentSlice)?.activeMatch,
  );
  const matches = useSelector(
    (state: RootState) => (state.tournament as StairwayTournamentSlice)?.tournament?.data?.matches,
  );
  const players = useSelector(
    (state: RootState) => (state.tournament as StairwayTournamentSlice)?.tournament?.data?.players,
  );
  const activePlayer = activeMatch?.players[0];
  const activePlayerId = activePlayer?.id;
  const activeRoundId = activeMatch?.roundId;

  useEffect(() => {
    dispatch(connectToStairwayTournament());

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeMatch) {
      const newActiveMatch = matches?.find(
        (match) => match.roundId === activeRoundId && match.players[0].id === activePlayerId,
      );
      // `setActiveMatch` is not declared on the typed `actions` map; preserved as-is at runtime.
      dispatch(
        (
          actions as unknown as Record<
            string,
            (payload: unknown) => { type: string; payload: unknown }
          >
        ).setActiveMatch(newActiveMatch),
      );
    }
  }, [activePlayerId, activeRoundId]);

  useEffect(() => {
    if (activeMatch) {
      dispatch(connectToActiveMatch(activeMatch));
    }
  }, [activeMatch]);

  if (!activeMatch) {
    return <Loading />;
  }

  return (
    <>
      <div className="container-fluid">
        <div className="row no-gutter cb-game">
          <div className="col-12 col-lg-6 p-1 vh-100">
            {/*
              TODO: fixme, pls
            <StairwayRounds
              players={players}
              activePlayerId={activePlayerId}
              activeRoundId={activeRoundId}
              setActiveRoundId={setActiveRoundId}
            />
      */}
            <StairwayEditorToolbar
              players={players as React.ComponentProps<typeof StairwayEditorToolbar>['players']}
              setActivePlayerId={() => {}}
              activePlayer={
                activePlayer as React.ComponentProps<typeof StairwayEditorToolbar>['activePlayer']
              }
            />
            <StairwayEditorContainer playerId={activePlayerId as number} />
          </div>
          <div className="col-12 col-lg-6 p-1 vh-100">
            <div className="d-flex flex-column h-100">
              <nav>
                <div
                  className="nav nav-tabs bg-gray text-uppercase font-weight-bold text-center"
                  id="nav-tab"
                  role="tablist"
                >
                  <a
                    className="nav-item nav-link col-3 active rounded-0 px-1 py-2"
                    id="task-tab"
                    data-toggle="tab"
                    href="#task"
                    role="tab"
                    aria-controls="task"
                    aria-selected="true"
                  >
                    Task
                  </a>
                  <a
                    className="nav-item nav-link col-3 rounded-0 px-1 py-2"
                    id="output-tab"
                    data-toggle="tab"
                    href="#output"
                    role="tab"
                    aria-controls="output"
                    aria-selected="false"
                  >
                    Output
                  </a>
                  <div className="rounded-0 text-center bg-white col-6 px-1 py-2">
                    00:00
                    {/* <TimerContainer
                    time={game.startsAt}
                    timeoutSeconds={game.timeoutSeconds}
                    gameStatusName={game.gameStatusName}
                  /> */}
                  </div>
                </div>
              </nav>
              <div className="tab-content flex-grow-1 overflow-auto " id="nav-tabContent">
                <div
                  className="tab-pane fade show active h-100"
                  id="task"
                  role="tabpanel"
                  aria-labelledby="task-tab"
                >
                  <StairwayGameInfo
                    tasks={meta?.tasks as React.ComponentProps<typeof StairwayGameInfo>['tasks']}
                    currentTaskId={meta?.currentTaskId as number}
                  />
                </div>
                <div
                  className="tab-pane h-100"
                  id="output"
                  role="tabpanel"
                  aria-labelledby="output-tab"
                >
                  <StairwayOutputTab playerId={activePlayerId as number} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default StairwayGameContainer;
