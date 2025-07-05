import React from 'react';

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

const renderPlayerId = (id, verticalAlign) => (
  <span style={{ marginLeft: '-0.2em', verticalAlign }}>{id}</span>
);

const renderImg = (_id, imgStyle) => (
  <img style={imgStyle} src="/assets/images/clans/1.png" alt="И" />
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
  nameLineHeight,
  headerVerticalAlign,
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

  console.log(leftOutput, rightOutput);

  return (
    <div className="d-flexflex-column w-100 h-100 cb-stream-full-info">
      <div className="d-flex w-100 justify-content-between py-3 px-4" style={{ height: '25%', minHeight: '25%', maxHeight: '25%' }}>
        <div>
          <div className="cb-stream-tasks-stats cb-stream-full-task-stats cb-stream-widget-text italic">
            <span style={{ verticalAlign: headerVerticalAlign, fontSize: taskHeaderFontSize }}>3/8 Задача</span>
          </div>
        </div>
        <div style={{ fontSize: descriptionFontSize }} className="cb-stream-task-description h-100 w-100 px-4">
          <TaskDescriptionMarkdown description={game?.task?.descriptionRu} />
        </div>
        <div className="d-flex flex-column pb-4 pl-3" style={{ width: '35%', minWidth: '35%', maxWidth: '35%' }}>
          <div className="d-flex cb-stream-full-output mt-2 mb-1">
            <div className="d-flex flex-column cb-stream-output-title" style={{ width: '33%', fontSize: outputTitleFontSize }}>
              <span>Входные</span>
              <span>данные</span>
            </div>
            <div className="d-flex align-items-center pl-2 cb-stream-output-data" style={{ fontSize: outputDataFontSize }}>
              {args}
            </div>
          </div>
          <div className="d-flex cb-stream-full-output mt-2 mb-1">
            <div className="d-flex flex-column cb-stream-output-title" style={{ width: '33%', fontSize: outputTitleFontSize }}>
              <span>Ожидаемые</span>
              <span>данные</span>
            </div>
            <div className="d-flex align-items-center pl-2 cb-stream-output-data" style={{ fontSize: outputDataFontSize }}>
              {expected}
            </div>
          </div>
        </div>
      </div>
      <div className="d-flex w-100 h-100 cb-stream-full-editors">
        <div className="cb-stream-full-editor position-relative editor-left p-2" style={{ width: '35%' }}>
          <div className="d-flex align-items-center p-2" style={{ fontSize: taskHeaderFontSize }}>
            <div
              className="d-flex position-relative align-items-center justify-content-center cb-stream-player-number cb-stream-widget-text italic"
              style={imgStyle}
            >
              {renderPlayerId(leftEditor?.playerId, headerVerticalAlign)}
            </div>
            <div className="cb-stream-player-clan h-100 position-relative mr-3">
              {/* {player?.clanId && ( */}
              {renderImg(leftPlayer?.clanId, imgStyle)}
              {/* )} */}
            </div>
            <div
              className="d-flex flex-column cb-stream-name cb-stream-widget-text"
              style={{ verticalAlign: headerVerticalAlign }}
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
          <div className="d-flex flex-column flex-grow-1 position-relative cb-editor-height h-100 px-2">
            <ExtendedEditor {...editorLeftParams} />
          </div>
          {leftOutput && (
            <div style={{ marginRight: '-10px' }} className="d-flex cb-stream-full-solution-bar position-absolute">
              <div className="d-flex w-100 justify-content-between">
                <div />
                <div
                  style={{ fontSize: taskHeaderFontSize }}
                  className="d-flex align-items-center cb-stream-widget-text italic mr-2"
                >
                  {`${leftOutput.successCount}/${leftOutput.assertsCount || 100}`}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-2" style={{ width: '30%' }} />
        <div className="cb-stream-full-editor position-relative editor-right p-2" style={{ width: '35%' }}>
          <div className="d-flex align-items-center p-2" style={{ fontSize: taskHeaderFontSize }}>
            <div
              className="d-flex position-relative align-items-center justify-content-center cb-stream-player-number cb-stream-widget-text italic"
              style={imgStyle}
            >
              {renderPlayerId(rightEditor?.playerId, headerVerticalAlign)}
            </div>
            <div className="cb-stream-player-clan h-100 position-relative mr-3">
              {/* {player?.clanId && ( */}
              {renderImg(rightPlayer?.clanId, imgStyle)}
              {/* )} */}
            </div>
            <div
              className="d-flex flex-column cb-stream-name cb-stream-widget-text"
              style={{ verticalAlign: headerVerticalAlign }}
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
          <div className="d-flex flex-column flex-grow-1 position-relative cb-editor-height h-100 px-2">
            <ExtendedEditor {...editorRightParams} />
          </div>
          {rightOutput && (
            <div style={{ marginLeft: '-10px' }} className="d-flex cb-stream-full-solution-bar position-absolute">
              <div className="d-flex w-100 justify-content-between">
                <div />
                <div
                  style={{ fontSize: taskHeaderFontSize }}
                  className="d-flex align-items-center cb-stream-widget-text italic mr-2"
                >
                  {`${rightOutput.successCount}/${rightOutput.assertsCount || 100}`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StreamFullPanel;
