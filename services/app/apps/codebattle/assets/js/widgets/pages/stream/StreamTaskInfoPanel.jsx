import React from 'react';

import upperCase from 'lodash/upperCase';
import { useSelector } from 'react-redux';

import {
  firstPlayerSelector, leftExecutionOutputSelector, rightExecutionOutputSelector, secondPlayerSelector,
} from '@/selectors';

import TaskDescriptionMarkdown from '../game/TaskDescriptionMarkdown';

function StreamTaskInfoPanel({
  game,
  orientation,
  roomMachineState,
  fontSize,
  width = '40%',
}) {
  const outputSelector = orientation === 'left' ? leftExecutionOutputSelector : rightExecutionOutputSelector;
  const playerSelector = orientation === 'left' ? firstPlayerSelector : secondPlayerSelector;

  const output = useSelector(outputSelector(roomMachineState));
  const player = useSelector(playerSelector);

  const assert = output?.asserts ? output.asserts[0] : {};

  const args = assert?.arguments;
  const expected = assert?.expected;
  const result = assert?.result || assert?.value;

  return (
    <div className="d-flex cb-stream-widget flex-column justify-content-between" style={{ width, maxWidth: width, minWidth: width }}>
      <div className="d-flex pt-4 justify-content-between">
        <div>
          <div style={{ fontSize }} className="cb-stream-tasks-stats cb-stream-widget-text">
            <span>3/8 ЗАДАЧ</span>
          </div>
        </div>
        <div>
          <div className="cb-stream-player-number">{player?.id || 0}</div>
        </div>
        {/* <div> */}
        {/*   <span>3 / 8 Задача</span> */}
        {/* </div> */}
        <div className="d-flex flex-column align-items-center cb-stream-name cb-stream-widget-text">
          {(player?.name || 'Фамилия Имя').split(' ').map(str => (
            <div style={{ fontSize }}>{upperCase(str || 'Test')}</div>
          ))}
        </div>
      </div>
      <div className="cb-stream-task-description h-100 py-5" style={{ fontSize }}>
        <TaskDescriptionMarkdown description={game?.task?.descriptionRu} />
      </div>
      <div className="d-flex flex-column">
        <div className="d-flex flex-column pb-4" style={{ fontSize }}>
          <div className="d-flex cb-stream-output mt-2 mb-1">
            <div className="d-flex align-items-center cb-stream-output-title cb-stream-widget-text">Входные данные</div>
            <div className="cb-stream-output-data align-content-around">{args}</div>
          </div>
          <div className="d-flex cb-stream-output mb-1">
            <div className="d-flex align-items-center cb-stream-output-title cb-stream-widget-text">Ожидаемый результат</div>
            <div className="cb-stream-output-data align-content-around">{expected}</div>
          </div>
          <div className="d-flex cb-stream-output mt-1 mb-2">
            <div className="d-flex align-items-center cb-stream-output-title cb-stream-widget-text">Полученный результат</div>
            <div className="cb-stream-output-data align-content-around">{result}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StreamTaskInfoPanel;
