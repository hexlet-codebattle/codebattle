import React from 'react';
import { useSelector } from 'react-redux';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import { gameTaskSelector, gameStatusSelector } from '../selectors';

const InfoWidget = () => {
  const taskText = useSelector(gameTaskSelector);
  const startsAt = useSelector(state => gameStatusSelector(state).startsAt);
  const timeoutSeconds = useSelector(state => gameStatusSelector(state).timeoutSeconds);
  const gameStatusName = useSelector(state => gameStatusSelector(state).status);
  return (
    <>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        <Task
          task={taskText}
          time={startsAt}
          timeoutSeconds={timeoutSeconds}
          gameStatusName={gameStatusName}
        />
      </div>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        <ChatWidget />
      </div>
    </>
  );
};

export default InfoWidget;
