import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { connectToGame, setGameChannel } from '@/middlewares/Room';
import useGameRoomMachine from '@/utils/useGameRoomMachine';
import useMachineStateSelector from '@/utils/useMachineStateSelector';
import useSearchParams from '@/utils/useSearchParams';

import * as machineSelectors from '../../machines/selectors';
import { connectToStream } from '../../middlewares/Stream';

import StreamEditorPanel from './StreamEditorPanel';
import StreamFullPanel from './StreamFullPanel';
import StreamTaskInfoPanel from './StreamTaskInfoPanel';

const orientations = {
  NONE: 'none',
  LEFT: 'left',
  RIGHT: 'right',
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

  const fontSize = searchParams.has('fontSize') ? searchParams.get('fontSize') : 16;
  const codeFontSize = searchParams.has('codeFontSize') ? searchParams.get('codeFontSize') : 16;
  const headerFontSize = searchParams.has('headerFontSize') ? searchParams.get('headerFontSize') : 16;
  const widthInfoPanelPercentage = searchParams.has('widthInfoPanel') ? searchParams.get('widthInfoPanel') : 40;
  const widthEditorPanelPercentage = searchParams.has('widthEditorPanel') ? searchParams.get('widthEditorPanel') : 60;

  const { mainService, waitingRoomService } = useGameRoomMachine({
    mainMachine,
    taskMachine,
    waitingRoomMachine,
  });

  const roomMachineState = useMachineStateSelector(
    mainService,
    machineSelectors.roomStateSelector,
  );

  useEffect(() => {
    dispatch(connectToStream());
  }, []);

  useEffect(() => {
    if (!game.id) {
      return () => { };
    }

    const channel = setGameChannel(game.id);

    const options = { cancelRedirect: true };
    connectToGame(mainService, waitingRoomService, options)(dispatch);

    const clearChannel = () => {
      if (channel) {
        channel.leave();
      }
    };

    return clearChannel;
  }, [game.id, mainService, waitingRoomService, dispatch]);

  if (!game.id) {
    return <div className="vh-100 cb-stream-widget" />;
  }

  return (
    <div className="vh-100 p-2 cb-stream-widget">
      <div className="d-flex flex-column w-100 h-100">
        <div className="cb-stream-widget-header cb-stream-widget-text" style={headerFontSize}>
          <div className="cb-stream-widget-header-img-left" />
          <div className="cb-stream-widget-header-title text-center p-4">Баттл Вузов</div>
          <div className="cb-stream-widget-header-img-right" />
        </div>
        <div className="p-2">
          {orientations.NONE === orientation && (
            <StreamFullPanel
              game={game}
              roomMachineState={roomMachineState}
              fontSize={fontSize}
              codeFontSize={codeFontSize}
            />
          )}
          <div className="d-flex w-100 h-100" styles={{ fontSize }}>
            {orientations.LEFT === orientation && (
              <>
                <StreamTaskInfoPanel
                  game={game}
                  orientation={orientation}
                  roomMachineState={roomMachineState}
                  fontSize={fontSize}
                  width={`${widthInfoPanelPercentage}%`}
                />
                <StreamEditorPanel
                  orientation={orientation}
                  roomMachineState={roomMachineState}
                  fontSize={codeFontSize}
                  width={`${widthEditorPanelPercentage}%`}
                />

              </>
            )}
            {orientations.RIGHT === orientation && (
              <>
                <StreamEditorPanel
                  orientation={orientation}
                  roomMachineState={roomMachineState}
                  fontSize={codeFontSize}
                  width={`${widthEditorPanelPercentage}%`}
                />
                <StreamTaskInfoPanel
                  game={game}
                  orientation={orientation}
                  roomMachineState={roomMachineState}
                  fontSize={fontSize}
                  width={`${widthInfoPanelPercentage}%`}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StreamWidget;
