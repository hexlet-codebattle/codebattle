import React from 'react';
import { connect } from 'react-redux';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import * as selectors from '../selectors';

const InfoWidget = (props) => {
  const {
    taskText, gameStatusName, timeoutSeconds, joinsAt,
  } = props;

  return (
    <div className="row no-gutters">
      <div className="col-12 col-lg-6 p-1">
        <Task
          task={taskText}
          time={joinsAt}
          timeoutSeconds={timeoutSeconds}
          gameStatusName={gameStatusName}
        />
      </div>
      <div className="col-12 col-lg-6 p-1">
        <ChatWidget />
      </div>
    </div>
  );
};


const mapStateToProps = (state) => {
  const gameStatus = selectors.gameStatusSelector(state);

  return {
    taskText: selectors.gameTaskSelector(state),
    joinsAt: gameStatus.joinsAt,
    timeoutSeconds: gameStatus.timeoutSeconds,
    gameStatusName: gameStatus.status,
  };
};

export default connect(mapStateToProps)(InfoWidget);
