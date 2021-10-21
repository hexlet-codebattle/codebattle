import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ChatWidget from './ChatWidget';
import StairwayGameInfo from '../components/StairwayGameInfo';
import Editor from './Editor';

const StairwayGameContainer = () => {
    const dispatch = useDispatch();
    const [currentUserId, setCurrentUserId] = useState(1);
    const [currentTaskId, setCurrentTaskId] = useState(1);

    const {
        gameStatus,
        tasks,
        players,
        outputs,
        editorValues,
    } = useSelector(state => state.stairwayGame);

    useEffect(() => {
        // connectToStairwayGame();
    });

    /*
        rightSide: 1 tab: taskInfo 50%/ chat 50%
                   2 tab: output
                   3 tab (info): timer / rang player (stairway)
    */

    return (
      <>
        <div className="container-fluid">
          <div className="row no-gutter cb-game">
            <div className="col-12 col-lg-6 p-1 vh-100">
              {/* <StairwayEditorContainer
              editorValues={editorValues}
            /> */}
              <Editor
                value="bla-bla"
                editable={false}
                syntax=""
                onChange={() => {}}
                mode=""
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
                      currentUserId={currentUserId}
                      currentTaskId={currentTaskId}
                      tasks={tasks}
                    />
                    {/* <ChatWidget /> */}
                  </div>
                  <div
                    className="tab-pane h-100"
                    id="output"
                    role="tabpanel"
                    aria-labelledby="output-tab"
                  >
                    {/* <StairwayOutputTab
                  currentTaskId={currentTaskId}
                  outputs={outputs}
                /> */}
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
