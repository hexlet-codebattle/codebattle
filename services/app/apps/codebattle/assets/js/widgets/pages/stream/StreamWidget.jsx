import React, { useEffect } from 'react';

import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import { connectToGame, setGameChannel } from '@/middlewares/Room';
import { leftEditorSelector, executionOutputSelector, rightEditorSelector } from '@/selectors';
import useGameRoomMachine from '@/utils/useGameRoomMachine';
import useMachineStateSelector from '@/utils/useMachineStateSelector';
import useSearchParams from '@/utils/useSearchParams';

import * as machineSelectors from '../../machines/selectors';
import { connectToStream } from '../../middlewares/Stream';
import { actions } from '../../slices';

import StreamEditorPanel from './StreamEditorPanel';
import StreamFullPanel from './StreamFullPanel';
import StreamTaskInfoPanel from './StreamTaskInfoPanel';

const orientations = {
  NONE: 'none',
  LEFT: 'left',
  RIGHT: 'right',
};

const toPxlStr = number => `${number}px`;
const toPrcStr = number => `${number}%`;

const useWinnerHeader = (orientation, roomMachineState) => {
  const editorSelector = orientation === 'left' ? leftEditorSelector : rightEditorSelector;

  const editor = useSelector(editorSelector(roomMachineState));
  const output = useSelector(executionOutputSelector(editor?.playerId, roomMachineState));

  if (orientation === orientations.NONE) {
    return false;
  }

  return output?.status === 'ok';
};

function StreamWidget({
  mainMachine,
  waitingRoomMachine,
  taskMachine,
}) {
  const dispatch = useDispatch();
  const game = useSelector(state => state.game);
  const searchParams = useSearchParams();
  const orientation = searchParams.has('orientation') ? searchParams.get('orientation') : orientations.NONE;

  const headerVerticalAlign = toPxlStr(searchParams.has('headerVerticalAlign') ? searchParams.get('headerVerticalAlign') : -1);
  const statusVerticalAlign = toPxlStr(searchParams.has('statusVerticalAlign') ? searchParams.get('statusVerticalAlign') : -1);
  const taskHeaderFontSize = toPxlStr(searchParams.has('taskHeaderFontSize') ? searchParams.get('taskHeaderFontSize') : 16);
  const descriptionFontSize = toPxlStr(searchParams.has('descriptionFontSize') ? searchParams.get('descriptionFontSize') : 16);
  const outputTitleFontSize = toPxlStr(searchParams.has('outputTitleFontSize') ? searchParams.get('outputTitleFontSize') : 16);
  const outputDataFontSize = toPxlStr(searchParams.has('outputDataFontSize') ? searchParams.get('outputDataFontSize') : 16);
  const codeFontSize = toPxlStr(searchParams.has('codeFontSize') ? searchParams.get('codeFontSize') : 16);
  const headerFontSize = toPxlStr(searchParams.has('headerFontSize') ? searchParams.get('headerFontSize') : 16);
  const testBarMarginBottom = toPrcStr(searchParams.has('testBarMarginBottom') ? searchParams.get('testBarMarginBottom') : 10);
  const testBarFontSize = toPxlStr(searchParams.has('testBarFontSize') ? searchParams.get('testBarFontSize') : 40);
  const testBarHeight = toPrcStr(searchParams.has('testBarHeight') ? searchParams.get('testBarHeight') : 10);
  const testBarWinGifTop = toPxlStr(searchParams.has('testBarWinGifTop') ? searchParams.get('testBarWinGifTop') : -200);
  const testBarProgressGifTop = toPxlStr(searchParams.has('testBarProgressGifTop') ? searchParams.get('testBarProgressGifTop') : -100);
  const nameLineHeight = toPxlStr(searchParams.has('nameLineHeight') ? searchParams.get('nameLineHeight') : 10);
  const imgSize = toPxlStr(searchParams.has('imgSize') ? searchParams.get('imgSize') : 10);
  const widthInfoPanelPercentage = toPrcStr(searchParams.has('widthInfoPanel') ? searchParams.get('widthInfoPanel') : 40);
  const widthEditorPanelPercentage = toPrcStr(searchParams.has('widthEditorPanel') ? searchParams.get('widthEditorPanel') : 60);
  const outputTitleWidth = toPrcStr(searchParams.has('outputTitleWidth') ? searchParams.get('outputTitleWidth') : 25);
  const progressGifSize = toPxlStr(searchParams.has('progressGifSize') ? searchParams.get('progressGifSize') : 100);
  const winGifSize = toPxlStr(searchParams.has('winGifSize') ? searchParams.get('winGifSize') : 100);

  const { mainService, waitingRoomService } = useGameRoomMachine({
    mainMachine,
    taskMachine,
    waitingRoomMachine,
    options: {
      withoutModals: false,
    },
  });

  const roomMachineState = useMachineStateSelector(
    mainService,
    machineSelectors.roomStateSelector,
  );

  useEffect(() => {
    dispatch(connectToStream());
  }, [dispatch]);

  useEffect(() => {
    if (!game.id) {
      return () => { };
    }

    const channel = setGameChannel(game.id);

    const options = { cancelRedirect: true };
    dispatch(actions.clearGamePlayers());
    connectToGame(mainService, waitingRoomService, options)(dispatch);

    const clearChannel = () => {
      if (channel) {
        channel.leave();
      }
    };

    return clearChannel;
  }, [game.id, mainService, waitingRoomService, dispatch]);

  const isWinnerHeader = useWinnerHeader(orientation, roomMachineState);

  if (!game.id) {
    return <div className="vh-100 overflow-hidden cb-stream-widget" />;
  }

  const headerTitleClassName = orientation === orientations.NONE ? 'cb-stream-full-widget-header-title' : 'cb-stream-widget-header-title';

  return (
    <div className={cn(
      'vh-100 overflow-hidden cb-stream-widget',
      {
        'cb-stream-full-bg': orientation === orientations.NONE,
        'cb-stream-left-bg': orientation === orientations.LEFT,
        'cb-stream-right-bg': orientation === orientations.RIGHT,
      },
    )}
    >
      <div className={cn(
        'd-flex flex-column w-100 h-100',
        { winner: isWinnerHeader },
      )}
      >
        <div className="cb-stream-widget-header cb-stream-widget-text italic d-flex" style={{ fontSize: headerFontSize }}>
          <div className={`${headerTitleClassName} text-center p-1`}>
            <span style={{ verticalAlign: headerVerticalAlign }}>Баттл Вузов</span>
          </div>
        </div>
        <div className="d-flex flex-column h-100">
          {orientations.NONE === orientation && (
            <StreamFullPanel
              game={game}
              imgStyle={{ width: imgSize, height: imgSize }}
              roomMachineState={roomMachineState}
              nameLineHeight={nameLineHeight}
              taskHeaderFontSize={taskHeaderFontSize}
              descriptionFontSize={descriptionFontSize}
              outputTitleFontSize={outputTitleFontSize}
              outputDataFontSize={outputDataFontSize}
              outputTitleWidth={outputTitleWidth}
              statusVerticalAlign={statusVerticalAlign}
              codeFontSize={codeFontSize}
              testBarMarginBottom={testBarMarginBottom}
              testBarFontSize={testBarFontSize}
              testBarHeight={testBarHeight}
              testBarWinGifTop={testBarWinGifTop}
              testBarProgressGifTop={testBarProgressGifTop}
              progressGifSize={progressGifSize}
              winGifSize={winGifSize}
            />
          )}
          {orientations.LEFT === orientation && (
            <div className="d-flex w-100 flex-grow-1 h-100">
              <StreamTaskInfoPanel
                game={game}
                orientation={orientation}
                roomMachineState={roomMachineState}
                nameLineHeight={nameLineHeight}
                taskHeaderFontSize={taskHeaderFontSize}
                descriptionFontSize={descriptionFontSize}
                outputTitleFontSize={outputTitleFontSize}
                outputDataFontSize={outputDataFontSize}
                headerVerticalAlign={statusVerticalAlign}
                outputTitleWidth={outputTitleWidth}
                imgStyle={{ width: imgSize, height: imgSize }}
                width={widthInfoPanelPercentage}
              />
              <StreamEditorPanel
                orientation={orientation}
                roomMachineState={roomMachineState}
                fontSize={codeFontSize}
                testBarFontSize={testBarFontSize}
                testBarHeight={testBarHeight}
                testBarWinGifTop={testBarWinGifTop}
                testBarProgressGifTop={testBarProgressGifTop}
                width={widthEditorPanelPercentage}
                taskHeaderFontSize={taskHeaderFontSize}
                progressGifSize={progressGifSize}
                winGifSize={winGifSize}
              />
            </div>
          )}
          {orientations.RIGHT === orientation && (
            <div className="d-flex w-100 flex-grow-1 h-100">
              <StreamEditorPanel
                orientation={orientation}
                roomMachineState={roomMachineState}
                fontSize={codeFontSize}
                testBarFontSize={testBarFontSize}
                testBarHeight={testBarHeight}
                testBarWinGifTop={testBarWinGifTop}
                testBarProgressGifTop={testBarProgressGifTop}
                width={widthEditorPanelPercentage}
                taskHeaderFontSize={taskHeaderFontSize}
                progressGifSize={progressGifSize}
                winGifSize={winGifSize}
              />
              <StreamTaskInfoPanel
                game={game}
                orientation={orientation}
                roomMachineState={roomMachineState}
                nameLineHeight={nameLineHeight}
                taskHeaderFontSize={taskHeaderFontSize}
                descriptionFontSize={descriptionFontSize}
                outputTitleFontSize={outputTitleFontSize}
                outputDataFontSize={outputDataFontSize}
                headerVerticalAlign={statusVerticalAlign}
                outputTitleWidth={outputTitleWidth}
                imgStyle={{ width: imgSize, height: imgSize }}
                width={widthInfoPanelPercentage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StreamWidget;
