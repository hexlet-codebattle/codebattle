import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
import _ from 'lodash';

import userTypes from '../config/userTypes';
import { actions } from '../slices';

import ChatWidget from './ChatWidget';
import StairwayGameInfo from '../components/StairwayGameInfo';
import StairwayOutputTab from './StairwayOutputTab';
import StairwayEditorContainer from './StairwayEditorContainer';
import StairwayEditorToolbar from '../components/StairwayEditorToolbar';

const StairwayGameContainer = ({ defaultPlayerId = 1, defaultRoundId = 0 }) => {
    const dispatch = useDispatch();

    const {
        gameStatus,
        rounds,
        players,
    } = useSelector(state => state.stairwayGame);

    const [activePlayerId, setActivePlayerId] = useState(defaultPlayerId);
    const [activeRoundId, setActiveRoundId] = useState(defaultRoundId);

    useEffect(() => {
      const currentUser = Gon.getAsset('current_user');
      dispatch(
        actions.setCurrentUser({ user: { ...currentUser, type: userTypes.spectator } }),
      );

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // connectToStairwayGame();
    }, [activePlayerId]);

    const activePlayer = useMemo(() => _.find(players, { id: activePlayerId }), [activePlayerId, players]);

    return (
      <>
        <div className="container-fluid">
          <div className="row no-gutter cb-game">
            <div className="col-12 col-lg-6 p-1 vh-100">
              {/* <StairwayRounds
                  players={players} // 5 rounds
                  activePlayerId={activePlayerId}
                  activeRoundId={activeRoundId}
                  setactiveRoundId={setactiveRoundId}
                /> */}
              <StairwayEditorToolbar
                players={players}
                setActivePlayerId={setActivePlayerId}
                activePlayer={activePlayer}
              />
              <StairwayEditorContainer
                playerId={activePlayerId}
              />
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
                    <div
                      className="rounded-0 text-center bg-white col-6 text-black px-1 py-2"
                    >
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
                      rounds={rounds}
                      roundId={activeRoundId}
                    />
                    {/* <ChatWidget /> */}
                  </div>
                  <div
                    className="tab-pane h-100"
                    id="output"
                    role="tabpanel"
                    aria-labelledby="output-tab"
                  >
                    <StairwayOutputTab
                      playerId={activePlayerId}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
};

export default StairwayGameContainer;
