import React from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import { executionOutputSelector, leftEditorSelector, rightEditorSelector } from '@/selectors';

import ExtendedEditor from '../../components/Editor';
import editorThemes from '../../config/editorThemes';

function StreamEditorPanel({
  orientation,
  roomMachineState,
  fontSize,
  width = '60%',
  testBarHeight,
  testBarWinGifTop,
  testBarProgressGifTop,
  testBarFontSize,
  progressGifSize,
  winGifSize,
}) {
  const editorSelector = orientation === 'left' ? leftEditorSelector : rightEditorSelector;

  const editor = useSelector(editorSelector(roomMachineState));
  const output = useSelector(executionOutputSelector(editor?.playerId, roomMachineState));

  const editorParams = {
    editable: false,
    syntax: editor?.currentLangSlug,
    theme: editorThemes.custom,
    mute: true,
    loading: false,
    value: editor?.text || '',
    fontSize,
    lineNumbers: 'off',
    wordWrap: 'on',
    showVimStatusBar: false,
    scrollbarStatus: 'hidden',
    // Add required props
    onChange: () => { },
    mode: 'default',
    roomMode: 'spectator',
    checkResult: () => { },
    userType: 'spectator',
    userId: editor?.playerId,
  };

  const isWinner = output?.status === 'ok';

  return (
    <div
      className={cn(
        `position-relative cb-stream-editor-panel p-2 mt-4 cb-stream-editor-${orientation}`,
        { winner: isWinner },
      )}
      style={{ width, maxWidth: width, minWidth: width }}
    >

      <div className="d-flex flex-column flex-grow-1 position-relative cb-editor-height h-100 px-2 pt-2">
        <ExtendedEditor {...editorParams} />
      </div>
      {output && (
        <div style={{ marginLeft: '-10px', height: testBarHeight }} className="d-flex cb-stream-full-solution-bar position-absolute">
          <div className="d-flex w-100">
            <div className="d-flex w-100 justify-content-end">
              <div
                style={{ fontSize: testBarFontSize }}
                className="d-flex align-items-center cb-stream-widget-text italic mr-2 pr-2"
              >
                {`${Math.round(((output.successCount || 0) * 100) / (output.assertsCount || 1))}/100`}
              </div>
            </div>
            <img
              alt="И"
              src={isWinner ? '/assets/images/stream/win_bv.png' : '/assets/images/stream/progress.png'}
              className="position-absolute"
              style={{
                top: (isWinner ? testBarWinGifTop : testBarProgressGifTop),
                width: (isWinner ? winGifSize : progressGifSize),
                height: (isWinner ? winGifSize : progressGifSize),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default StreamEditorPanel;
