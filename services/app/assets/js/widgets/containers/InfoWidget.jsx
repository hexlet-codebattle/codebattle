import React from 'react';
import { connect } from 'react-redux';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import * as selectors from '../selectors';

const InfoWidget = props => {
  const {
    taskText, gameStatusName, timeoutSeconds, startsAt,
  } = props;

  return (
    <div className="row no-gutters" style={{ height: '300px' }}>
      <div className="col-12 col-lg-6 p-1 h-100">
        <Task
          task={taskText}
          time={startsAt}
          timeoutSeconds={timeoutSeconds}
          gameStatusName={gameStatusName}
        />
      </div>
      <div className="col-12 col-lg-6 p-1 h-100">
        <ChatWidget />
      </div>
    </div>
  );
};


const mapStateToProps = state => {
  const gameStatus = selectors.gameStatusSelector(state);
  return {
    taskText: selectors.gameTaskSelector(state),
    startsAt: gameStatus.startsAt,
    timeoutSeconds: gameStatus.timeoutSeconds,
    gameStatusName: gameStatus.status,
  };
};

export default connect(mapStateToProps)(InfoWidget);
