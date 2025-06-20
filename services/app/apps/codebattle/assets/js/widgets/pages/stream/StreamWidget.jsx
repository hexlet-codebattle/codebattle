import React, { useEffect, useState } from 'react';

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

  const [fontSize, setFontSize] = useState(16);
  const [codeFontSize, setCodeFontSize] = useState(16);

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
      {orientations.NONE === orientation && (
        <StreamFullPanel
          game={game}
          roomMachineState={roomMachineState}
          fontSize={fontSize}
          codeFontSize={codeFontSize}
          setFontSize={setFontSize}
          setCodeFontSize={setCodeFontSize}
        />
      )}
      {orientations.LEFT === orientation && (
        <div className="d-flex w-100 h-100" styles={{ fontSize }}>
          <StreamTaskInfoPanel
            game={game}
            orientation={orientation}
            roomMachineState={roomMachineState}
            fontSize={fontSize}
            codeFontSize={codeFontSize}
            setFontSize={setFontSize}
            setCodeFontSize={setCodeFontSize}
          />
          <StreamEditorPanel orientation={orientation} roomMachineState={roomMachineState} fontSize={codeFontSize} />
        </div>
      )}
      {orientations.RIGHT === orientation && (
        <div className="d-flex w-100 h-100" styles={{ fontSize }}>
          <StreamEditorPanel orientation={orientation} roomMachineState={roomMachineState} fontSize={codeFontSize} />
          <StreamTaskInfoPanel
            game={game}
            orientation={orientation}
            roomMachineState={roomMachineState}
            fontSize={fontSize}
            codeFontSize={codeFontSize}
            setFontSize={setFontSize}
            setCodeFontSize={setCodeFontSize}
          />
        </div>
      )}
    </div>
  );
}

export default StreamWidget;
