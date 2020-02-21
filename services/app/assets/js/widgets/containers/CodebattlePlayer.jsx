import React, { Component } from 'react';
import { Slider, PlayerIcon } from 'react-player-controls';
import { connect } from 'react-redux';

import { Direction } from 'react-player-controls/dist/constants';
import * as selectors from '../selectors';
import * as actions from '../actions';
import { getText, getFinalState, parse } from '../lib/player';
import CodebattleSliderBar from '../components/CodebattleSliderBar';

const isEqual = (float1, float2) => {
  const compareEpsilon = Number.EPSILON;
  return Math.abs(float1 - float2) < compareEpsilon;
};

class CodebattlePlayer extends Component {
  constructor(props) {
    super(props);

    props.setStepCoefficient();

    this.state = {
      mode: 'pause',
      isEnabled: true,
      nextRecordId: 0,
      delaySetGameState: 10,
      isStop: true,
      isHold: false,
      isHoldPlay: false,
      direction: Direction.HORIZONTAL,
      value: 0,
      speed: 70,
      lastIntent: 0,
    };
  }

  onControlButtonClick() {
    const { mode } = this.state;

    switch (mode) {
      case 'pause': {
        this.onPlayClick();
        break;
      }
      case 'playing': {
        this.onPauseClick();
        break;
      }
      default:
        break;
    }
  }

  onPlayClick() {
    const { isStop, value } = this.state;

    if (value === 0) {
      this.setGameState();
    }

    if (isStop) {
      this.start();
      this.play();
    }
  }

  onPauseClick() {
    this.stop();
  }

  onSliderHandleChange(value) {
    this.setState({ value });

    const { isHold, delaySetGameState } = this.state;

    const run = () => {
      const { value: currentValue } = this.state;
      const isSync = isEqual(currentValue, value);
      if (isSync) {
        this.setGameState();
      }
    };

    if (isHold) {
      setTimeout(run, delaySetGameState);
    }
  }

  onSliderHandleChangeStart() {
    this.setState({ isHold: true });

    const { isStop } = this.state;
    if (!isStop) {
      this.stop();
      this.setState({ isHoldPlay: true });
    }
  }

  onSliderHandleChangeEnd() {
    this.setState({ isHold: false });

    const { isHoldPlay } = this.state;

    if (isHoldPlay) {
      this.setState({ isHoldPlay: false });
      this.start();
      this.play();
    }
  }

  onSliderHandleChangeIntent(intent) {
    this.setState(() => ({ lastIntent: intent }));
  }

  onSliderHandleChangeIntentEnd() {
    this.setState(() => ({ lastIntent: 0 }));
  }

  async setGameState() {
    const {
      initRecords,
      records,
      stepCoefficient,
      updateEditorTextPlaybook,
      updateExecutionOutput,
      fetchChatData,
    } = this.props;

    const { value } = this.state;

    const resultId = Math.floor(value / stepCoefficient);

    const gameInitialState = {
      players: initRecords,
      chat: { users: [], messages: [] },
      nextRecordId: 0,
    };

    const {
      players: editorsState,
      chat: chatState,
      nextRecordId,
    } = getFinalState({ recordId: resultId, records, gameInitialState });
    this.setState({ nextRecordId });

    editorsState.forEach(player => {
      updateEditorTextPlaybook({
        userId: player.id,
        editorText: player.editorText,
        langSlug: player.editorLang,
      });

      updateExecutionOutput({
        ...player.checkResult,
        userId: player.id,
      });
    });

    fetchChatData(chatState);
  }

  async changeGameState() {
    const {
      records,
      updateEditorTextPlaybook,
      updateExecutionOutput,
      fetchChatData,
      getEditorTextPlaybook,
    } = this.props;
    const { nextRecordId } = this.state;
    const nextRecord = parse(records[nextRecordId]) || {};

    switch (nextRecord.type) {
      case 'update_editor_data': {
        const editorText = getEditorTextPlaybook(nextRecord);
        const newEditorText = getText(editorText, nextRecord.diff);
        updateEditorTextPlaybook({
          userId: nextRecord.userId,
          editorText: newEditorText,
          langSlug: nextRecord.diff.nextLang,
        });
        break;
      }
      case 'check_complete': {
        updateExecutionOutput({
          ...nextRecord.checkResult,
          userId: nextRecord.userId,
        });
        break;
      }
      case 'chat_message':
      case 'join_chat':
      case 'leave_chat': {
        fetchChatData(nextRecord.chat);
        break;
      }
      default: {
        break;
      }
    }

    this.setState({ nextRecordId: nextRecordId + 1 });
  }

  play() {
    const { value, speed } = this.state;

    const run = () => {
      const { isStop, value: currentValue } = this.state;
      const { stepCoefficient } = this.props;
      const isSync = isEqual(currentValue, value);

      if (!isStop && isSync) {
        const newValue = value + stepCoefficient;
        this.setState({ value: newValue > 1 ? 1 : newValue });
        this.changeGameState();
        this.play();
      }
    };

    if (value < 1) {
      setTimeout(run, speed);
    } else {
      this.resetValue();
      this.resetNextRecordId();
      this.stop();
    }
  }

  resetNextRecordId() {
    this.setState({ nextRecordId: 0 });
  }

  resetValue() {
    this.setState({ value: 0.0 });
  }

  start() {
    this.setState({
      mode: 'playing',
      isStop: false,
    });
  }

  stop() {
    this.setState({
      mode: 'pause',
      isStop: true,
    });
  }

  handleKeyPress(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.onControlButtonClick();
    }
  }

  render() {
    const { records } = this.props;

    const {
      isEnabled, direction, value: currentValue, isStop, isHold, lastIntent,
    } = this.state;

    if (records == null) {
      return null;
    }

    return (
      <>
        <div className="py-4" />
        <div className="container-fluid fixed-bottom my-1">
          <div className="px-1">
            <div className="border bg-light py-2">
              <div className="row align-items-center justify-content-center">
                <div className="mr-4 btn btn-light" role="button" tabIndex={0} onClick={() => this.onControlButtonClick()} onKeyPress={this.handleKeyPress}>
                  {isStop
                    ? (
                      <PlayerIcon.Play
                        width={32}
                        height={32}
                      />
                    )
                    : (
                      <PlayerIcon.Pause
                        width={32}
                        height={32}
                      />
                    )}
                </div>
                <Slider
                  className="x-slider col-md-7 ml-1"
                  isEnabled={isEnabled}
                  direction={direction}
                  onChange={value => this.onSliderHandleChange(value)}
                  onChangeStart={startValue => this.onSliderHandleChangeStart(startValue)}
                  onChangeEnd={endValue => this.onSliderHandleChangeEnd(endValue)}
                  onIntent={intent => this.onSliderHandleChangeIntent(intent)}
                  onIntentEnd={endIntent => this.onSliderHandleChangeIntentEnd(endIntent)}
                >
                  <CodebattleSliderBar
                    value={currentValue}
                    lastIntent={lastIntent}
                    isHold={isHold}
                  />
                </Slider>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

const mapStateToProps = state => ({
  initRecords: selectors.getPlaybookInitRecords(state),
  records: selectors.getPlaybookRecords(state),
  stepCoefficient: selectors.getStepCoefficient(state),
  getEditorTextPlaybook: ({ userId }) => selectors.getEditorTextPlaybook(state, userId),
});

const mapDispatchToProps = {
  setStepCoefficient: actions.setStepCoefficient,
  updateEditorTextPlaybook: actions.updateEditorTextPlaybook,
  updateExecutionOutput: actions.updateExecutionOutput,
  fetchChatData: actions.fetchChatData,
};

export default connect(mapStateToProps, mapDispatchToProps)(CodebattlePlayer);
