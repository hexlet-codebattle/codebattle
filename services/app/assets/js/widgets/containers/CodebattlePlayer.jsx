import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Slider } from 'react-player-controls';
import { Direction } from 'react-player-controls/dist/constants';
import qs from 'qs';
import CodebattleSliderBar from '../components/CodebattleSliderBar';
import ControlPanel from '../components/CBPlayer/ControlPanel';
import GameContext from './GameContext';
import speedModes from '../config/speedModes';
import { actions } from '../slices';
import * as GameActions from '../middlewares/Game';
import { replayerMachineStates } from '../machines/game';
import { playbookRecordsSelector } from '../selectors';

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
    const { handlerPosition } = this.state;
    const { current: gameCurrent, send } = this.context;

    if (gameCurrent.matches({ replayer: replayerMachineStates.ended })) {
      this.setGameState(0.0);
      send('PLAY');
      this.play(0.0);
    }

    if (gameCurrent.matches({ replayer: replayerMachineStates.paused })) {
      send('PLAY');
      this.play(handlerPosition);
    }
  }

  onPauseClick = () => {
    const { send } = this.context;
    send('PAUSE');
  }

  onChangeSpeed = () => {
    const { send } = this.context;
    send('TOGGLE_SPEED_MODE');
  }

  // Slider callbacks

  onSliderHandleChange = value => {
    this.setState({ handlerPosition: value });

    const { setGameStateDelay } = this.state;
    const { current: gameCurrent } = this.context;

    if (gameCurrent.matches({ replayer: replayerMachineStates.holded })) {
      setTimeout(this.runSetGameState, setGameStateDelay, value);
    }
  }

  onSliderHandleChangeStart = () => {
    const { send } = this.context;
    send('HOLD');
  }

  onSliderHandleChangeEnd = handlerPosition => {
    const { setError } = this.props;
    const { current: gameCurrent, send } = this.context;
    const { holding } = gameCurrent.context;

    switch (holding) {
      case 'play':
        send('RELEASE_AND_PLAY');
        this.play(handlerPosition);
        break;
      case 'pause':
        send('RELEASE_AND_PAUSE');
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
    const { send } = this.context;

    // Based on handler position we can calculate next record
    const nextRecordId = Math.floor(handlerPosition / stepCoefficient);

    setGameStateByRecordId(nextRecordId);

    if (nextRecordId + 1 >= recordsCount) {
      send('END');
    }

    this.setState({ handlerPosition, nextRecordId });
  }

  updateGameState = () => {
    const { updateGameStateByRecordId, recordsCount } = this.props;
    const { nextRecordId: recordId } = this.state;
    const { send } = this.context;
    const nextRecordId = recordId + 1;

    updateGameStateByRecordId(recordId);

    if (nextRecordId >= recordsCount) {
      send('END');
      this.setState({ handlerPosition: 1.0 });
    }

    this.setState({ nextRecordId });
  }

  play = handlerPosition => {
    const { current: gameCurrent } = this.context;

    const { speedMode } = gameCurrent.context;
    const playDelay = playDelays[speedMode];

    setTimeout(this.runPlay, playDelay, handlerPosition);
  }

  runPlay = handlerPosition => {
    const { stepCoefficient } = this.props;
    const { handlerPosition: currentHandlerPosition } = this.state;
    const { current: gameCurrent } = this.context;

    /*
     * User can change handler position and replayer state.
     * We need check them before setting next state.
     */
    const isSync = isEqual(currentHandlerPosition, handlerPosition);

    if (gameCurrent.matches({ replayer: replayerMachineStates.playing }) && isSync) {
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
    const { current: gameCurrent } = this.context;
    const { recordsCount, mainEvents } = this.props;

    const {
      isEnabled, direction, handlerPosition, lastIntent, nextRecordId,
    } = this.state;

    if (!gameCurrent.matches({ replayer: replayerMachineStates.on })) {
      return null;
    }

    return (
      <>
        <div className="py-5" />
        <div className="container-fluid fixed-bottom">
          <div className="px-1">
            <div className="border bg-light">
              <div className="row align-items-center justify-content-center">
                <ControlPanel
                  nextRecordId={nextRecordId}
                  gameCurrent={gameCurrent}
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
                      gameCurrent={gameCurrent}
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

CodebattlePlayer.contextType = GameContext;

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
