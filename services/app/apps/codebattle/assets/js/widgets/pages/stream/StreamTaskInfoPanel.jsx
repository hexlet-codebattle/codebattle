import React from 'react';

import upperCase from 'lodash/upperCase';
import { useSelector } from 'react-redux';

import {
  firstPlayerSelector, leftExecutionOutputSelector, rightExecutionOutputSelector, secondPlayerSelector,
} from '@/selectors';

import TaskDescriptionMarkdown from '../game/TaskDescriptionMarkdown';

const renderPlayerId = id => (
  <span style={{ marginLeft: '-0.2em' }}>{id}</span>
);

function StreamTaskInfoPanel({
  game,
  orientation,
  roomMachineState,
  nameLineHeight,
  taskHeaderFontSize,
  descriptionFontSize,
  outputTitleFontSize,
  outputDataFontSize,
  imgStyle = { width: '16px', height: '16px' },
  width = '40%',
  outputTitleWidth = '24%',
  headerVerticalAlign = '-1px',
}) {
  const outputSelector = orientation === 'left' ? leftExecutionOutputSelector : rightExecutionOutputSelector;
  const playerSelector = orientation === 'left' ? firstPlayerSelector : secondPlayerSelector;

  const output = useSelector(outputSelector(roomMachineState));
  const player = useSelector(playerSelector);

  const assert = output?.asserts ? output.asserts[0] : {};

  const defaultData = '';

  const args = assert?.arguments || defaultData;
  const expected = assert?.expected || defaultData;
  const result = assert?.result || assert?.value || defaultData;

  const id = player?.id || 0;

  return (
    <div className="d-flex cb-stream-widget flex-column justify-content-between px-3" style={{ width, maxWidth: width, minWidth: width }}>
      <div className="d-flex pt-4" style={{ fontSize: taskHeaderFontSize }}>
        <div>
          <div
            className="cb-stream-tasks-stats cb-stream-widget-text italic"
          >
            <span style={{ verticalAlign: headerVerticalAlign }}>3/8 ЗАДАЧ</span>
          </div>
        </div>
        <div>
          <div className="d-flex flex-row align-items-center w-auto h-100 px-3">
            <div
              className="d-flex position-relative align-items-center justify-content-center cb-stream-player-number cb-stream-widget-text italic"
              style={imgStyle}
            >
              {renderPlayerId(id)}
            </div>
            <div className="cb-stream-player-clan h-100 position-relative">
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
              style={{ lineHeight: nameLineHeight }}
            >
              {upperCase(str || 'Test')}
            </div>
          ))}
        </div>
      </div>
      <div className="cb-stream-task-description h-100 py-5" style={{ fontSize: descriptionFontSize }}>
        <TaskDescriptionMarkdown description={game?.task?.descriptionRu} />
      </div>
      <div className="d-flex flex-column">
        <div className="d-flex flex-column pb-4" style={{ fontSize: outputTitleFontSize }}>
          <div className="d-flex cb-stream-output mt-2 mb-1">
            <div
              className="d-flex flex-column cb-stream-output-title"
              style={{ width: outputTitleWidth, minWidth: outputTitleWidth, maxWidth: outputTitleWidth }}
            >
              <div>Входные</div>
              <div>данные</div>
            </div>
            <div className="cb-stream-output-data align-content-around" style={{ fontSize: outputDataFontSize }}>{args}</div>
          </div>
          <div className="d-flex cb-stream-output mb-1">
            <div
              className="d-flex flex-column cb-stream-output-title"
              style={{ width: outputTitleWidth, minWidth: outputTitleWidth, maxWidth: outputTitleWidth }}
            >
              <div>Ожидаемый</div>
              <div>результат</div>
            </div>
            <div className="cb-stream-output-data align-content-around" style={{ fontSize: outputDataFontSize }}>{expected}</div>
          </div>
          <div className="d-flex cb-stream-output mt-1 mb-2">
            <div
              className="d-flex flex-column cb-stream-output-title"
              style={{ width: outputTitleWidth, minWidth: outputTitleWidth, maxWidth: outputTitleWidth }}
            >
              <div>Полученный</div>
              <div>результат</div>
            </div>
            <div className="cb-stream-output-data align-content-around" style={{ fontSize: outputDataFontSize }}>{result}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StreamTaskInfoPanel;
