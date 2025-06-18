import React from 'react';

import upperCase from 'lodash/upperCase';
import { useSelector } from 'react-redux';

import {
  firstPlayerSelector, leftExecutionOutputSelector, rightExecutionOutputSelector, secondPlayerSelector,
} from '@/selectors';

import TaskDescriptionMarkdown from '../game/TaskDescriptionMarkdown';

function StreamTaskInfoPanel({ game, orientation, roomMachineState }) {
  const outputSelector = orientation === 'left' ? leftExecutionOutputSelector : rightExecutionOutputSelector;
  const playerSelector = orientation === 'left' ? firstPlayerSelector : secondPlayerSelector;

  const output = useSelector(outputSelector(roomMachineState));
  const player = useSelector(playerSelector);

  const assert = output?.asserts ? output.asserts[0] : {};

  const args = assert?.arguments;
  const expected = assert?.expected;
  const result = assert?.result || assert?.value;

  return (
    <div className="d-flex flex-column justify-content-between col-4">
      <div className="d-flex pt-4 justify-content-between">
        <div className="cb-stream-tasks-stats">
          <span>3/8 ЗАДАЧ</span>
        </div>
        {/* <div> */}
        {/*   <span>3 / 8 Задача</span> */}
        {/* </div> */}
        <div className="d-flex align-items-center cb-stream-name">
          <span>{upperCase(player?.name || 'Башкевич Илья')}</span>
        </div>
      </div>
      <div className="cb-stream-task-description h-100 py-5">
        <TaskDescriptionMarkdown description={game?.task?.descriptionRu} />
      </div>
      <div className="d-flex flex-column pb-4">
        <div className="d-flex cb-stream-output mt-2 mb-1">
          <div className="d-flex align-items-center cb-stream-output-title">Входные данные</div>
          <div className="cb-stream-output-data align-content-around">{args}</div>
        </div>
        <div className="d-flex cb-stream-output mb-1">
          <div className="d-flex align-items-center cb-stream-output-title">Ожидаемый результат</div>
          <div className="cb-stream-output-data align-content-around">{expected}</div>
        </div>
        <div className="d-flex cb-stream-output mt-1 mb-2">
          <div className="d-flex align-items-center cb-stream-output-title">Полученный результат</div>
          <div className="cb-stream-output-data align-content-around">{result}</div>
        </div>
      </div>
    </div>
  );
}

export default StreamTaskInfoPanel;
