import React from 'react';

import cn from 'classnames';
import upperCase from 'lodash/upperCase';
import { useSelector } from 'react-redux';

import {
  firstPlayerSelector, leftExecutionOutputSelector, rightExecutionOutputSelector, secondPlayerSelector,
} from '@/selectors';

import TaskDescriptionMarkdown from '../game/TaskDescriptionMarkdown';

const getUrl = (id, isWinner) => (
  isWinner ? `/assets/images/clans/${id}-win.png` : `/assets/images/clans/${id}.png`
);

const renderImg = (id, imgStyle, isWinner) => (
  id ? <img style={imgStyle} src={getUrl(id, isWinner)} alt="" /> : <></>
);

const renderPlayerId = (id, verticalAlign, marginBottom) => (
  <span style={{ marginLeft: '-0.2em', verticalAlign, marginBottom }}>{id}</span>
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
  numberMarginBottom,
}) {
  const outputSelector = orientation === 'left' ? leftExecutionOutputSelector : rightExecutionOutputSelector;
  const playerSelector = orientation === 'left' ? firstPlayerSelector : secondPlayerSelector;

  const output = useSelector(outputSelector(roomMachineState));
  const player = useSelector(playerSelector);

  const taskAssert = game?.task?.asserts ? game.task.asserts[0] : {};
  const assert = output?.asserts ? output.asserts[0] : {};

  const defaultData = '';

  const args = JSON.stringify(assert?.arguments || taskAssert.arguments || defaultData);
  const expected = JSON.stringify(assert?.expected || taskAssert.expected || defaultData);
  const result = JSON.stringify(assert?.result || assert?.value);

  const id = player?.id || 0;
  const clanId = player?.clanId;
  const isWinner = output?.status === 'ok';

  return (
    <div
      className={cn(
        'd-flex cb-stream-widget flex-column justify-content-between px-4',
        { winner: isWinner },
      )}
      style={{ width, maxWidth: width, minWidth: width }}
    >
      <div className="d-flex pt-4" style={{ fontSize: taskHeaderFontSize }}>
        <div>
          <div
            className={
              cn(
                'cb-stream-tasks-stats cb-stream-widget-text',
                { winner: isWinner },
              )
            }
          >
            <div style={{ marginBottom: numberMarginBottom }}>
              <span style={{ verticalAlign: headerVerticalAlign }}>
                {`${(game?.task?.id || 1) % 21}/21 ЗАДАЧ`}
              </span>
            </div>
          </div>
        </div>
        <div>
          <div className="d-flex flex-row align-items-center w-auto h-100 px-3">
            <div
              className={cn(
                'd-flex position-relative align-items-center justify-content-center cb-stream-player-number cb-stream-widget-text',
                { winner: isWinner },
              )}
              style={imgStyle}
            >
              {renderPlayerId(id, headerVerticalAlign, numberMarginBottom)}
            </div>
            <div
              className={
                cn(
                  'cb-stream-player-clan h-100 position-relative',
                  { winner: isWinner },
                )
              }
            >
              {renderImg(clanId, imgStyle, isWinner)}
            </div>
          </div>
        </div>
        {/* <div> */}
        {/*   <span>3 / 8 Задача</span> */}
        {/* </div> */}
        <div
          className={
            cn(
              'd-flex flex-column cb-stream-name cb-stream-widget-text',
              { winner: isWinner },
            )
          }
          style={{ verticalAlign: headerVerticalAlign }}
        >
          {(player?.name || 'Фамилия Имя').split(' ').map(str => (
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
          <div className="d-flex cb-stream-output my-2">
            <div
              className={cn(
                'd-flex flex-column cb-stream-output-title',
                { winner: isWinner },
              )}
              style={{ width: outputTitleWidth, minWidth: outputTitleWidth, maxWidth: outputTitleWidth }}
            >
              <div>Входные</div>
              <div>данные</div>
            </div>
            <div className="d-flex cb-stream-output-data align-items-center pl-3" style={{ fontSize: outputDataFontSize }}>{args}</div>
          </div>
          <div className="d-flex cb-stream-output my-2">
            <div
              className={cn(
                'd-flex flex-column cb-stream-output-title',
                { winner: isWinner },
              )}
              style={{ width: outputTitleWidth, minWidth: outputTitleWidth, maxWidth: outputTitleWidth }}
            >
              <div>Ожидаемый</div>
              <div>результат</div>
            </div>
            <div className="d-flex cb-stream-output-data align-items-center pl-3" style={{ fontSize: outputDataFontSize }}>{expected}</div>
          </div>
          <div className="d-flex cb-stream-output my-2">
            <div
              className={cn(
                'd-flex flex-column cb-stream-output-title',
                { winner: isWinner },
              )}
              style={{ width: outputTitleWidth, minWidth: outputTitleWidth, maxWidth: outputTitleWidth }}
            >
              <div>Полученный</div>
              <div>результат</div>
            </div>
            <div className="d-flex cb-stream-output-data align-items-center pl-3" style={{ fontSize: outputDataFontSize }}>{result}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StreamTaskInfoPanel;
