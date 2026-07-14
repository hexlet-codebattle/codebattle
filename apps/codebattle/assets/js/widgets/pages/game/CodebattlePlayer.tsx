import React, { Component } from 'react';

import qs from 'qs';
import { Slider } from 'react-player-controls';
import { Direction } from 'react-player-controls/dist/constants';
import { connect } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import speedModes from '../../config/speedModes';
import playbackModes from '../../config/playbackModes';
import { replayerMachineStates } from '../../machines/game';
import * as GameActions from '../../middlewares/Room';
import { parse } from '../../lib/player';
import { playbookRecordsSelector } from '../../selectors';
import { actions, type RootState } from '../../slices';

import CodebattleSliderBar from './CodebattleSliderBar';
import ControlPanel from './ControlPanel';

const playDelays = {
  [speedModes.normal]: 100,
  [speedModes.fast]: 50,
  [speedModes.faster]: 25,
};

const speedScales = {
  [speedModes.normal]: 1,
  [speedModes.fast]: 2,
  [speedModes.faster]: 4,
};

const isEqual = (float1: number, float2: number) => {
  const compareEpsilon = Number.EPSILON;
  return Math.abs(float1 - float2) < compareEpsilon;
};

const getRecordTime = (records: string[] | null, index: number): number | null => {
  if (!records || index < 0 || index >= records.length) return null;
  try {
    const parsed = parse(records[index]);
    return typeof parsed.time === 'number' ? parsed.time : null;
  } catch (e) {
    return null;
  }
};

interface CodebattlePlayerStateProps {
  records: string[];
  recordsCount: number;
  stepCoefficient: number;
  mainEvents: MainEvent[];
  startTime: number | null;
  totalDuration: number | null;
}

interface CodebattlePlayerDispatchProps {
  setError: typeof actions.setError;
  setGameStateByRecordId: (recordId: number) => void;
  updateGameStateByRecordId: (recordId: number) => void;
}

// xstate v4 state — no usable exported type (rule 7)
type CodebattlePlayerProps = CodebattlePlayerStateProps &
  CodebattlePlayerDispatchProps & {
    roomMachineState: any;
  };

interface CodebattlePlayerState {
  isEnabled: boolean;
  setGameStateDelay: number;
  direction: unknown;
  nextRecordId: number;
  handlerPosition: number;
  smoothHandlerPosition: number;
  lastIntent: number;
  playbackMode: string;
}

interface MainEvent {
  recordId: number;
  time?: number;
  userName?: string;
  [key: string]: unknown;
}

class CodebattlePlayer extends Component<CodebattlePlayerProps, CodebattlePlayerState> {
  static contextType = RoomContext;

  declare context: { mainService: any };

  animationFrameId: number | undefined;

  constructor(props: CodebattlePlayerProps) {
    super(props);
    const { stepCoefficient } = props;

    const getParams = window.location.href.split('?')[1];
    const parsedParams = getParams ? qs.parse(getParams) : {};
    const nextRecordId = parsedParams.t ? Number(parsedParams.t) : 0;
    const playbackMode =
      parsedParams.realtime === 'false' ? playbackModes.standard : playbackModes.realtime;

    this.state = {
      isEnabled: true,
      setGameStateDelay: 10,
      direction: Direction.HORIZONTAL,
      nextRecordId,
      // handlerPosition and intent have range from 0.0 to 1.0
      handlerPosition: stepCoefficient * nextRecordId,
      smoothHandlerPosition: stepCoefficient * nextRecordId,
      lastIntent: 0,
      playbackMode,
    };
  }

  componentWillUnmount() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  animateSmoothHandlerPosition = (
    startPosition: number,
    targetPosition: number,
    duration: number,
  ) => {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (duration <= 0) {
      this.setState({ smoothHandlerPosition: targetPosition });
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const fraction = Math.min(elapsed / duration, 1.0);
      const newPosition = startPosition + fraction * (targetPosition - startPosition);

      this.setState({ smoothHandlerPosition: newPosition });

      if (fraction < 1.0) {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    this.animationFrameId = requestAnimationFrame(tick);
  };

  // ControlPanel API

  onPlayClick = () => {
    const { roomMachineState } = this.props;
    const { handlerPosition } = this.state;
    const { mainService } = this.context;

    if (roomMachineState.matches({ replayer: replayerMachineStates.ended })) {
      this.setGameState(0.0);
      mainService.send('PLAY');
      this.play(0.0);
    }

    if (roomMachineState.matches({ replayer: replayerMachineStates.paused })) {
      mainService.send('PLAY');
      this.play(handlerPosition);
    }
  };

  onPauseClick = () => {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    const { mainService } = this.context;
    mainService.send('PAUSE');
  };

  onChangeSpeed = () => {
    const { mainService } = this.context;
    mainService.send('TOGGLE_SPEED_MODE');
  };

  onChangePlaybackMode = () => {
    this.setState((state) => ({
      playbackMode:
        state.playbackMode === playbackModes.realtime
          ? playbackModes.standard
          : playbackModes.realtime,
    }));
  };

  // Slider callbacks

  onSliderHandleChange = (value: number) => {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.setState({ handlerPosition: value, smoothHandlerPosition: value });

    const { roomMachineState } = this.props;
    const { setGameStateDelay } = this.state;

    if (roomMachineState.matches({ replayer: replayerMachineStates.holded })) {
      setTimeout(this.runSetGameState, setGameStateDelay, value);
    }
  };

  onSliderHandleChangeStart = () => {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    const { mainService } = this.context;
    mainService.send('HOLD');
  };

  onSliderHandleChangeEnd = (handlerPosition: number) => {
    const { setError, roomMachineState } = this.props;
    const { mainService } = this.context;
    const { holding } = roomMachineState.context;

    switch (holding) {
      case 'play':
        mainService.send('RELEASE_AND_PLAY');
        this.play(handlerPosition);
        break;
      case 'pause':
        mainService.send('RELEASE_AND_PAUSE');
        break;
      default:
        setError(new Error('Unexpected holding state [replayer machine]'));
    }
  };

  onSliderHandleChangeIntent = (intent: number) => {
    this.setState(() => ({ lastIntent: intent }));
  };

  onSliderHandleChangeIntentEnd = () => {
    this.setState(() => ({ lastIntent: 0 }));
  };

  // Helpers

  setGameState = (handlerPosition: number) => {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    const { setGameStateByRecordId, stepCoefficient, recordsCount } = this.props;
    const { mainService } = this.context;

    // Based on handler position we can calculate next record
    const nextRecordId = Math.floor(handlerPosition / stepCoefficient);

    setGameStateByRecordId(nextRecordId);

    if (nextRecordId + 1 >= recordsCount) {
      mainService.send('END');
    }

    this.setState({ handlerPosition, smoothHandlerPosition: handlerPosition, nextRecordId });
  };

  updateGameState = () => {
    const { updateGameStateByRecordId, recordsCount } = this.props;
    const { nextRecordId: recordId } = this.state;
    const { mainService } = this.context;
    const nextRecordId = recordId + 1;

    updateGameStateByRecordId(recordId);

    if (nextRecordId >= recordsCount) {
      mainService.send('END');
      this.setState({ handlerPosition: 1.0, smoothHandlerPosition: 1.0 });
    }

    this.setState({ nextRecordId });
  };

  play = (handlerPosition: number) => {
    const { roomMachineState, records, stepCoefficient } = this.props;
    const { playbackMode } = this.state;

    const { speedMode } = roomMachineState.context;
    const playDelay = playDelays[speedMode];

    let delay = playDelay;

    if (playbackMode === playbackModes.realtime && records) {
      const nextRecordId = Math.floor(handlerPosition / stepCoefficient);
      if (nextRecordId > 0 && nextRecordId < records.length) {
        try {
          const currentRecord = parse(records[nextRecordId - 1]);
          const nextRecord = parse(records[nextRecordId]);
          if (currentRecord && nextRecord && currentRecord.time && nextRecord.time) {
            const diff = nextRecord.time - currentRecord.time;
            if (diff >= 0) {
              const speedScale = speedScales[speedMode] || 1;
              const maxRealtimeDelay = 2000; // max delay between events in real-time is 2 seconds
              delay = Math.min(diff / speedScale, maxRealtimeDelay);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    // Trigger smooth transition of smoothHandlerPosition
    const targetPosition = handlerPosition + stepCoefficient;
    this.animateSmoothHandlerPosition(
      handlerPosition,
      targetPosition > 1.0 ? 1.0 : targetPosition,
      delay,
    );

    setTimeout(this.runPlay, delay, handlerPosition);
  };

  runPlay = (handlerPosition: number) => {
    const { stepCoefficient, roomMachineState } = this.props;
    const { handlerPosition: currentHandlerPosition } = this.state;

    /*
     * User can change handler position and replayer state.
     * We need check them before setting next state.
     */
    const isSync = isEqual(currentHandlerPosition, handlerPosition);

    if (roomMachineState.matches({ replayer: replayerMachineStates.playing }) && isSync) {
      const offset = handlerPosition + stepCoefficient;
      const newPosition = offset > 1 ? 1 : offset;

      this.setState({ handlerPosition: newPosition, smoothHandlerPosition: newPosition });

      this.updateGameState();
      this.play(newPosition);
    }
  };

  runSetGameState = (handlerPosition: number) => {
    const { handlerPosition: currentHandlerPosition } = this.state;

    /*
     * User can change handler position.
     * We need check this before setting state.
     */
    const isSync = isEqual(currentHandlerPosition, handlerPosition);
    if (isSync) {
      this.setGameState(currentHandlerPosition);
    }
  };

  render() {
    const { recordsCount, mainEvents, roomMachineState, records, startTime, totalDuration } =
      this.props;

    const {
      isEnabled,
      direction,
      handlerPosition,
      smoothHandlerPosition,
      lastIntent,
      nextRecordId,
      playbackMode,
    } = this.state;

    if (!roomMachineState.matches({ replayer: replayerMachineStates.on }) || recordsCount === 0) {
      return null;
    }

    const currentRecordTime = getRecordTime(records, nextRecordId);
    const currentTime =
      currentRecordTime !== null && startTime !== null
        ? Math.max(0, currentRecordTime - startTime)
        : null;

    return (
      <>
        <div className="py-5" />
        <div className="container-fluid fixed-bottom">
          <div className="px-1">
            <div className="cb-bg-highlight-panel cb-rounded">
              <div className="d-flex align-items-center justify-content-center">
                <ControlPanel
                  nextRecordId={nextRecordId}
                  roomMachineState={roomMachineState}
                  playbackMode={playbackMode}
                  onChangePlaybackMode={this.onChangePlaybackMode}
                  onPlayClick={this.onPlayClick}
                  onPauseClick={this.onPauseClick}
                  onChangeSpeed={this.onChangeSpeed}
                  currentTime={currentTime}
                  totalDuration={totalDuration}
                >
                  <Slider
                    className="cb-slider col-md-7 ml-1"
                    value={smoothHandlerPosition}
                    isEnabled={isEnabled}
                    direction={direction}
                    onChange={this.onSliderHandleChange}
                    onChangeStart={this.onSliderHandleChangeStart}
                    onChangeEnd={this.onSliderHandleChangeEnd}
                    onIntent={this.onSliderHandleChangeIntent}
                    onIntentEnd={this.onSliderHandleChangeIntentEnd}
                  >
                    <CodebattleSliderBar
                      holded={roomMachineState.matches({
                        replayer: replayerMachineStates.holded,
                      })}
                      mainEvents={mainEvents}
                      handlerPosition={smoothHandlerPosition}
                      lastIntent={lastIntent}
                      recordsCount={recordsCount}
                      setGameState={this.setGameState}
                      startTime={startTime}
                    />
                  </Slider>
                </ControlPanel>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

const mapStateToProps = (state: RootState): CodebattlePlayerStateProps => {
  const records = (playbookRecordsSelector(state) || []) as string[];
  const recordsCount = records.length;
  const mainEvents = state.playbook.mainEvents as MainEvent[];

  const startTime = getRecordTime(records, 0);
  const endTime = getRecordTime(records, recordsCount - 1);
  const totalDuration =
    startTime !== null && endTime !== null ? Math.max(0, endTime - startTime) : null;

  return {
    records,
    recordsCount,
    stepCoefficient: 1.0 / recordsCount,
    mainEvents,
    startTime,
    totalDuration,
  };
};

const mapDispatchToProps = {
  setError: actions.setError,
  setGameStateByRecordId: GameActions.setGameHistoryState,
  updateGameStateByRecordId: GameActions.updateGameHistoryState,
};

export default connect(mapStateToProps, mapDispatchToProps)(CodebattlePlayer);
