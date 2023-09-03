import React, { Component } from 'react';

import qs from 'qs';
import { Slider } from 'react-player-controls';
import { Direction } from 'react-player-controls/dist/constants';
import { connect } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import speedModes from '../../config/speedModes';
import { replayerMachineStates } from '../../machines/game';
import * as GameActions from '../../middlewares/Game';
import { playbookRecordsSelector } from '../../selectors';
import { actions } from '../../slices';

import CodebattleSliderBar from './CodebattleSliderBar';
import ControlPanel from './ControlPanel';

const playDelays = {
  [speedModes.normal]: 100,
  [speedModes.fast]: 50,
};

const isEqual = (float1, float2) => {
  const compareEpsilon = Number.EPSILON;
  return Math.abs(float1 - float2) < compareEpsilon;
};

class CodebattlePlayer extends Component {
  constructor(props) {
    super(props);
    const { stepCoefficient } = props;

    const getParams = window.location.href.split('?')[1];
    const nextRecordId = getParams ? Number(qs.parse(getParams).t || 0) : 0;
    this.state = {
      isEnabled: true,
      setGameStateDelay: 10,
      direction: Direction.HORIZONTAL,
      nextRecordId,
      // handlerPosition and intent have range from 0.0 to 1.0
      handlerPosition: stepCoefficient * nextRecordId,
      lastIntent: 0,
    };
  }

  // ControlPanel API

  onPlayClick = () => {
    const { roomCurrent } = this.props;
    const { handlerPosition } = this.state;
    const { mainService } = this.context;

    if (roomCurrent.matches({ replayer: replayerMachineStates.ended })) {
      this.setGameState(0.0);
      mainService.send('PLAY');
      this.play(0.0);
    }

    if (roomCurrent.matches({ replayer: replayerMachineStates.paused })) {
      mainService.send('PLAY');
      this.play(handlerPosition);
    }
  }

  onPauseClick = () => {
    const { mainService } = this.context;
    mainService.send('PAUSE');
  }

  onChangeSpeed = () => {
    const { mainService } = this.context;
    mainService.send('TOGGLE_SPEED_MODE');
  }

  // Slider callbacks

  onSliderHandleChange = value => {
    this.setState({ handlerPosition: value });

    const { roomCurrent } = this.props;
    const { setGameStateDelay } = this.state;

    if (roomCurrent.matches({ replayer: replayerMachineStates.holded })) {
      setTimeout(this.runSetGameState, setGameStateDelay, value);
    }
  }

  onSliderHandleChangeStart = () => {
    const { mainService } = this.context;
    mainService.send('HOLD');
  }

  onSliderHandleChangeEnd = handlerPosition => {
    const { setError, roomCurrent } = this.props;
    const { mainService } = this.context;
    const { holding } = roomCurrent.context;

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
  }

  onSliderHandleChangeIntent = intent => {
    this.setState(() => ({ lastIntent: intent }));
  }

  onSliderHandleChangeIntentEnd = () => {
    this.setState(() => ({ lastIntent: 0 }));
  }

  // Helpers

  setGameState = handlerPosition => {
    const { setGameStateByRecordId, stepCoefficient, recordsCount } = this.props;
    const { mainService } = this.context;

    // Based on handler position we can calculate next record
    const nextRecordId = Math.floor(handlerPosition / stepCoefficient);

    setGameStateByRecordId(nextRecordId);

    if (nextRecordId + 1 >= recordsCount) {
      mainService.send('END');
    }

    this.setState({ handlerPosition, nextRecordId });
  }

  updateGameState = () => {
    const { updateGameStateByRecordId, recordsCount } = this.props;
    const { nextRecordId: recordId } = this.state;
    const { mainService } = this.context;
    const nextRecordId = recordId + 1;

    updateGameStateByRecordId(recordId);

    if (nextRecordId >= recordsCount) {
      mainService.send('END');
      this.setState({ handlerPosition: 1.0 });
    }

    this.setState({ nextRecordId });
  }

  play = handlerPosition => {
    const { roomCurrent } = this.props;

    const { speedMode } = roomCurrent.context;
    const playDelay = playDelays[speedMode];

    setTimeout(this.runPlay, playDelay, handlerPosition);
  }

  runPlay = handlerPosition => {
    const { stepCoefficient, roomCurrent } = this.props;
    const { handlerPosition: currentHandlerPosition } = this.state;

    /*
     * User can change handler position and replayer state.
     * We need check them before setting next state.
     */
    const isSync = isEqual(currentHandlerPosition, handlerPosition);

    if (roomCurrent.matches({ replayer: replayerMachineStates.playing }) && isSync) {
      const offset = handlerPosition + stepCoefficient;
      const newPosition = offset > 1 ? 1 : offset;

      this.setState({ handlerPosition: newPosition });

      this.updateGameState();
      this.play(newPosition);
    }
  };

  runSetGameState = handlerPosition => {
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
    const { recordsCount, mainEvents, roomCurrent } = this.props;

    const {
      isEnabled, direction, handlerPosition, lastIntent, nextRecordId,
    } = this.state;

    if (!roomCurrent.matches({ replayer: replayerMachineStates.on }) || recordsCount === 0) {
      return null;
    }

    return (
      <>
        <div className="py-5" />
        <div className="container-fluid fixed-bottom">
          <div className="px-1">
            <div className="border bg-light">
              <div className="d-flex align-items-center justify-content-center">
                <ControlPanel
                  nextRecordId={nextRecordId}
                  roomCurrent={roomCurrent}
                  onPlayClick={this.onPlayClick}
                  onPauseClick={this.onPauseClick}
                  onChangeSpeed={this.onChangeSpeed}
                >
                  <Slider
                    className="cb-slider col-md-7 ml-1"
                    value={handlerPosition}
                    isEnabled={isEnabled}
                    direction={direction}
                    onChange={this.onSliderHandleChange}
                    onChangeStart={this.onSliderHandleChangeStart}
                    onChangeEnd={this.onSliderHandleChangeEnd}
                    onIntent={this.onSliderHandleChangeIntent}
                    onIntentEnd={this.onSliderHandleChangeIntentEnd}
                  >
                    <CodebattleSliderBar
                      mainEvents={mainEvents}
                      roomCurrent={roomCurrent}
                      handlerPosition={handlerPosition}
                      lastIntent={lastIntent}
                      recordsCount={recordsCount}
                      setGameState={this.setGameState}
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

CodebattlePlayer.contextType = RoomContext;

const mapStateToProps = state => {
  const recordsCount = playbookRecordsSelector(state).length;
  const { mainEvents } = state.playbook;

  return {
    recordsCount,
    stepCoefficient: 1.0 / recordsCount,
    mainEvents,
  };
};

const mapDispatchToProps = {
  setError: actions.setError,
  setGameStateByRecordId: GameActions.setGameHistoryState,
  updateGameStateByRecordId: GameActions.updateGameHistoryState,
};

export default connect(mapStateToProps, mapDispatchToProps)(CodebattlePlayer);
