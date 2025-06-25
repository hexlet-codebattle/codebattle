import React from 'react';

import cn from 'classnames';
import upperCase from 'lodash/upperCase';
import { useSelector } from 'react-redux';

import ExtendedEditor from '@/components/Editor';
import {
  gamePlayerSelector,
  leftEditorSelector,
  leftExecutionOutputSelector,
  rightEditorSelector,
  rightExecutionOutputSelector,
} from '@/selectors';

import editorThemes from '../../config/editorThemes';
import TaskDescriptionMarkdown from '../game/TaskDescriptionMarkdown';

const getUrl = (id, isWinner) => (
  isWinner ? `/${id}-win.png` : `/${id}.png`
);

const renderPlayerId = (id, verticalAlign, marginBottom) => (
  <span style={{ marginLeft: '-0.2em', verticalAlign, marginBottom }}>{id}</span>
);

const renderImg = (id, imgStyle, isWinner = false) => (
  id ? <img style={imgStyle} src={`/assets/images/clans/${getUrl(id || 1, isWinner)}`} alt="" /> : <></>
);

function StreamFullPanel({
  game,
  roomMachineState,
  codeFontSize,
  imgStyle,
  taskHeaderFontSize,
  descriptionFontSize,
  outputTitleFontSize,
  outputDataFontSize,
  outputTitleWidth,
  nameLineHeight,
  statusVerticalAlign,
  testBarMarginBottom,
  testBarFontSize,
  testBarHeight,
  testBarWinGifTop,
  testBarProgressGifTop,
  numberMarginBottom,
  progressGifSize,
  winGifSize,
}) {
  const leftEditor = useSelector(leftEditorSelector(roomMachineState));
  const rightEditor = useSelector(rightEditorSelector(roomMachineState));
  const leftPlayer = useSelector(gamePlayerSelector(leftEditor?.playerId));
  const rightPlayer = useSelector(gamePlayerSelector(rightEditor?.playerId));
  const leftOutput = useSelector(leftExecutionOutputSelector(roomMachineState));
  const rightOutput = useSelector(rightExecutionOutputSelector(roomMachineState));

  const editorLeftParams = {
    editable: false,
    syntax: leftEditor?.currentLangSlug,
    theme: editorThemes.custom,
    mute: true,
    loading: false,
    value: leftEditor?.text || '',
    fontSize: codeFontSize,
    lineNumbers: false,
    wordWrap: 'on',
    showVimStatusBar: false,
    scrollbarStatus: 'hidden',
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    glyphMargin: false,
    folding: false,
    // Add required props
    onChange: () => { },
    mode: 'default',
    roomMode: 'spectator',
    checkResult: () => { },
    userType: 'spectator',
    userId: leftEditor?.playerId,
  };
  const editorRightParams = {
    editable: false,
    syntax: rightEditor?.currentLangSlug,
    theme: editorThemes.custom,
    mute: true,
    loading: false,
    value: rightEditor?.text || '',
    fontSize: codeFontSize,
    lineNumbers: false,
    wordWrap: 'on',
    showVimStatusBar: false,
    scrollbarStatus: 'hidden',
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    glyphMargin: false,
    folding: false,
    // Add required props
    onChange: () => { },
    mode: 'default',
    roomMode: 'spectator',
    checkResult: () => { },
    userType: 'spectator',
    userId: rightEditor?.playerId,
  };

  const assert = (game?.task?.asserts || [])[0];
  const args = assert ? JSON.stringify(assert.arguments) : '';
  const expected = assert ? JSON.stringify(assert.expected) : '';

  const isWinnerLeft = leftOutput?.status === 'ok';
  const isWinnerRight = rightOutput?.status === 'ok';

  return (
    <div className="d-flexflex-column w-100 h-100 cb-stream-full-info">
      <div className="d-flex w-100 justify-content-between py-3 px-4" style={{ height: '25%', minHeight: '25%', maxHeight: '25%' }}>
        <div>
          <div className="cb-stream-tasks-stats cb-stream-full-task-stats cb-stream-widget-text">
            <span style={{ verticalAlign: statusVerticalAlign, fontSize: taskHeaderFontSize, marginBottom: numberMarginBottom }}>
              {`${(game?.task?.id || 1) % 21}/21 ЗАДАЧ`}
            </span>
          </div>
        </div>
        <div style={{ fontSize: descriptionFontSize }} className="cb-stream-task-description h-100 w-100 px-4">
          <TaskDescriptionMarkdown description={game?.task?.descriptionRu} />
        </div>
        <div className="d-flex flex-column pb-4 pl-3" style={{ width: '35%', minWidth: '35%', maxWidth: '35%' }}>
          <div className="d-flex cb-stream-full-output mt-2 mb-1">
            <div className="d-flex flex-column cb-stream-output-title" style={{ width: outputTitleWidth, fontSize: outputTitleFontSize }}>
              <span>Входные</span>
              <span>данные</span>
            </div>
            <div className="d-flex align-items-center pl-3 cb-stream-output-data" style={{ fontSize: outputDataFontSize }}>
              {args}
            </div>
          </div>
          <div className="d-flex cb-stream-full-output mt-2 mb-1">
            <div className="d-flex flex-column cb-stream-output-title" style={{ width: outputTitleWidth, fontSize: outputTitleFontSize }}>
              <span>Ожидаемые</span>
              <span>данные</span>
            </div>
            <div className="d-flex align-items-center pl-3 cb-stream-output-data" style={{ fontSize: outputDataFontSize }}>
              {expected}
            </div>
          </div>
        </div>
      </div>
      <div className="d-flex w-100 cb-stream-full-editors" style={{ height: '75%', minHeight: '75%', maxHeight: '75%' }}>
        <div
          className={
            cn(
              'cb-stream-full-editor position-relative editor-left p-2',
              { winner: isWinnerLeft },
            )
          }
          style={{ width: '35%' }}
        >
          <div className="d-flex align-items-center p-2" style={{ fontSize: taskHeaderFontSize }}>
            <div
              className={
                cn(
                  'd-flex position-relative align-items-center justify-content-center',
                  'cb-stream-player-number cb-stream-widget-text',
                )
              }
              style={imgStyle}
            >
              {renderPlayerId(leftEditor?.playerId, statusVerticalAlign, numberMarginBottom)}
            </div>
            {leftPlayer?.clanId && (
              <div className="cb-stream-player-clan h-100 position-relative mr-3">
                {renderImg(leftPlayer?.clanId, imgStyle, isWinnerLeft)}
              </div>
            )}
            <div
              className={cn(
                'd-flex flex-column cb-stream-name cb-stream-widget-text ml-1',
              )}
              style={{ verticalAlign: statusVerticalAlign }}
            >
              {(leftPlayer?.name || 'Фамилия Имя').split(' ').map(str => (
                <div
                  key={str}
                  style={{ lineHeight: nameLineHeight }}
                >
                  {upperCase(str || 'Test')}
                </div>
              ))}
            </div>
          </div>
          <div className="d-flex flex-column flex-grow-1 position-relative cb-editor-height h-100 px-2">
            <ExtendedEditor {...editorLeftParams} />
          </div>
          {leftOutput && (
            <div
              style={{ bottom: testBarMarginBottom, marginLeft: '-0.3em', height: testBarHeight }}
              className={cn('d-flex cb-stream-full-solution-bar position-absolute')}
            >
              <div className="d-flex w-100 position-relative">
                <div className="d-flex w-100 justify-content-end">
                  <div
                    style={{ fontSize: testBarFontSize }}
                    className="d-flex align-items-center cb-stream-widget-text italic mr-2 inverted-bar"
                  >
                    {`${Math.round(((leftOutput.successCount || 0) * 100) / (leftOutput.assertsCount / 1))}/100`}
                  </div>
                </div>
                <img
                  alt="И"
                  src={isWinnerLeft ? '/assets/images/stream/win_bv.png' : '/assets/images/stream/progress.png'}
                  className="position-absolute"
                  style={{
                    top: (isWinnerLeft ? testBarWinGifTop : testBarProgressGifTop),
                    left: '-30px',
                    width: (isWinnerLeft ? winGifSize : progressGifSize),
                    height: (isWinnerLeft ? winGifSize : progressGifSize),
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="px-2" style={{ width: '30%' }} />
        <div
          className={cn(
            'cb-stream-full-editor position-relative editor-right p-2',
            { winner: isWinnerRight },
          )}
          style={{ width: '35%' }}
        >
          <div className="d-flex align-items-center p-2" style={{ fontSize: taskHeaderFontSize }}>
            <div
              className={
                cn(
                  'd-flex position-relative align-items-center justify-content-center',
                  'cb-stream-player-number cb-stream-widget-text',
                )
              }
              style={imgStyle}
            >
              {renderPlayerId(rightEditor?.playerId, statusVerticalAlign, numberMarginBottom)}
            </div>
            {rightPlayer?.clanId && (
              <div className="cb-stream-player-clan h-100 position-relative mr-3">
                {renderImg(rightPlayer?.clanId, imgStyle, isWinnerRight)}
              </div>
            )}
            <div
              className={
                cn(
                  'd-flex flex-column cb-stream-name cb-stream-widget-text ml-1',
                )
              }
              style={{ verticalAlign: statusVerticalAlign }}
            >
              {(rightPlayer?.name || 'Фамилия Имя').split(' ').map(str => (
                <div
                  key={str}
                  style={{ lineHeight: nameLineHeight }}
                >
                  {upperCase(str || 'Test')}
                </div>
              ))}
            </div>
          </div>
          <div className="d-flex flex-column flex-grow-1 position-relative cb-editor-height h-100 px-2">
            <ExtendedEditor {...editorRightParams} />
          </div>
          {rightOutput && (
            <div
              style={{ bottom: testBarMarginBottom, marginLeft: '-0.7em', height: testBarHeight }}
              className={cn('d-flex cb-stream-full-solution-bar position-absolute')}
            >
              <div className="d-flex w-100 position-relative">
                <div className="d-flex w-100 justify-content-end">
                  <div
                    style={{ fontSize: testBarFontSize }}
                    className="d-flex align-items-center cb-stream-widget-text italic inverted-bar mr-2"
                  >
                    {`${Math.round(((rightOutput.successCount || 0) * 100) / (rightOutput.assertsCount || 1))}/100`}
                  </div>
                </div>
                <img
                  alt="И"
                  src={isWinnerRight ? '/assets/images/stream/win_bv.png' : '/assets/images/stream/progress.png'}
                  className="position-absolute"
                  style={{
                    top: (isWinnerRight ? testBarWinGifTop : testBarProgressGifTop),
                    left: '-30px',
                    width: (isWinnerRight ? winGifSize : progressGifSize),
                    height: (isWinnerRight ? winGifSize : progressGifSize),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StreamFullPanel;
