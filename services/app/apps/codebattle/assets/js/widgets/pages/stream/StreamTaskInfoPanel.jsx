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
  nameLineHeight,
  fontSize,
  outputDataFontSize,
  imgStyle = { width: '16px', height: '16px' },
  width = '40%',
}) {
  const outputSelector = orientation === 'left' ? leftExecutionOutputSelector : rightExecutionOutputSelector;
  const playerSelector = orientation === 'left' ? firstPlayerSelector : secondPlayerSelector;

  const output = useSelector(outputSelector(roomMachineState));
  const player = useSelector(playerSelector);

  const assert = output?.asserts ? output.asserts[0] : {};

  const defaultData = '[sdfdsfsdfsdfdsfsdfsdfsdfsdf]';

  const args = assert?.arguments || defaultData;
  const expected = assert?.expected || defaultData;
  const result = assert?.result || assert?.value || defaultData;

  return (
    <div className="d-flex cb-stream-widget flex-column justify-content-between px-3" style={{ width, maxWidth: width, minWidth: width }}>
      <div className="d-flex pt-4">
        <div>
          <div style={{ fontSize }} className="cb-stream-tasks-stats cb-stream-widget-text italic">
            <span>3/8 ЗАДАЧ</span>
          </div>
        </div>
        <div>
          <div className="d-flex flex-row px-3">
            <div>
              <div className="d-flex align-items-center cb-stream-player-number cb-stream-widget-text italic">
                <span className="cb-stream-number-text">{player?.id || 0}</span>
              </div>
            </div>
            <div className="cb-stream-player-clan">
              {/* {player?.clanId && ( */}
              <img style={imgStyle} src="/assets/images/clans/1.png" alt="И" />
              {/* )} */}
            </div>
          </div>
        </div>
        {/* <div> */}
        {/*   <span>3 / 8 Задача</span> */}
        {/* </div> */}
        <div
          className="d-flex flex-column cb-stream-name cb-stream-widget-text"
        >
          {('Фамилия Имя').split(' ').map(str => (
            <div
              key={str}
              style={{ fontSize, lineHeight: `${nameLineHeight}px` }}
            >
              {upperCase(str || 'Test')}
            </div>
          ))}
        </div>
      </div>
      <div className="cb-stream-task-description h-100 py-5" style={{ fontSize }}>
        <TaskDescriptionMarkdown description={game?.task?.descriptionRu} />
      </div>
      <div className="d-flex flex-column">
        <div className="d-flex flex-column pb-4" style={{ fontSize }}>
          <div className="d-flex cb-stream-output mt-2 mb-1">
            <div className="d-flex align-items-center cb-stream-output-title">Входные данные</div>
            <div className="cb-stream-output-data align-content-around" style={{ fontSize: `${outputDataFontSize}px` }}>{args}</div>
          </div>
          <div className="d-flex cb-stream-output mb-1">
            <div className="d-flex align-items-center cb-stream-output-title">Ожидаемый результат</div>
            <div className="cb-stream-output-data align-content-around" style={{ fontSize: `${outputDataFontSize}px` }}>{expected}</div>
          </div>
          <div className="d-flex cb-stream-output mt-1 mb-2">
            <div className="d-flex align-items-center cb-stream-output-title">Полученный результат</div>
            <div className="cb-stream-output-data align-content-around" style={{ fontSize: `${outputDataFontSize}px` }}>{result}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StreamTaskInfoPanel;
