import React, { Component } from 'react';
import { Slider, PlayerIcon } from 'react-player-controls';
import { connect } from 'react-redux';

import { Direction } from 'react-player-controls/dist/constants';
import * as selectors from '../selectors';
import * as actions from '../actions';
import { getText, getFinalState } from '../lib/player';

const isEqual = (float1, float2) => {
  const compareEpsilon = Number.EPSILON;
  return Math.abs(float1 - float2) < compareEpsilon;
};

class CodebattlePlayer extends Component {
  constructor(props) {
    super(props);

    props.setStepCoefficient();

    this.state = {
      mode: "pause",
      isEnabled: true,
      nextRecordId: 0,
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

  async onSliderHandleChange(value) {
    this.setState({ value });

    const { isHold } = this.state;
    if (isHold) {
      setTimeout(() => {
        const { value: currentValue } = this.state;
        const isSync = isEqual(currentValue, value);
        if (isSync) {
          this.setGameState();
        }
      }, 10);
    }
  }

  async onSliderHandleChangeStart() {
    this.setState({ isHold: true });

    const { isStop } = this.state;
    if (!isStop) {
      this.stop();
      this.setState({ isHoldPlay: true });
    }
  }

  async onSliderHandleChangeEnd() {
    this.setState({ isHold: false });

    const { isHoldPlay } = this.state;

    if (isHoldPlay) {
      this.setState({ isHoldPlay: false });
      this.start();
      this.play();
    }
  }

  async onSliderHandleChangeIntent(intent) {
    this.setState(() => ({ lastIntent: intent }));
  }

  async onSliderHandleChangeIntentEnd() {
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
      nextRecordId
    } = getFinalState({ recordId: resultId, records, gameInitialState });

    this.setState({ nextRecordId });

    editorsState.forEach(player => {
      updateEditorTextPlaybook({
        userId: player.id,
        editorText: player.editorText,
        langSlug: player.editorLang,
      });

      updateExecutionOutput({
        userId: player.id,
        result: player.result,
        output: player.output,
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
    const nextRecord = records[nextRecordId] || {};

    switch (nextRecord.type) {
      case 'editor_text': {
        const editorText = getEditorTextPlaybook(nextRecord);
        const newEditorText = getText(editorText, nextRecord.diff);
        updateEditorTextPlaybook({
          userId: nextRecord.userId,
          editorText: newEditorText,
          langSlug: nextRecord.editorLang,
        });
        break;
      }
      case 'result_check': {
        updateExecutionOutput({
          userId: nextRecord.userId,
          result: nextRecord.result,
          output: nextRecord.output,
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

  async play() {
    const { value, speed } = this.state;
    const { stepCoefficient } = this.props;

    if (value < 1) {
      setTimeout(() => {
        const { isStop, value: currentValue } = this.state;
        const isSync = isEqual(currentValue, value);

        if (!isStop && isSync) {
          const newValue = value + stepCoefficient;
          this.setState({ value: newValue > 1 ? 1 : newValue });
          this.changeGameState();
          this.play();
        }
      }, speed);
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

  renderSliderBar = ({ value, className }) => (
    <div
      className={className}
      style={{
        width: `${value * 100}%`,
      }}
    />
  )

  renderSliderAction = ({ value, className }) => (
    <div
      className={className}
      style={{
        left: `${value * 100}%`,
      }}
    />
  )

  renderSliderHandle = ({ value, className, classNameButton }) => (
    <div
      className={className}
      style={{
        left: `${value * 100}%`,
      }}
    >
      <div className={classNameButton} />
    </div>
  )

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
                <div className="mr-4 btn btn-light" onClick={() => this.onControlButtonClick()}>
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
                  {this.renderSliderAction({ value: 0.5, className: 'x-slider-action bg-info' })}
                  <div className="x-slider-timeline bg-gray">
                    {!isHold && this.renderSliderBar({ value: lastIntent, className: 'x-slider-bar x-intent-background' })}
                    {this.renderSliderBar({ value: currentValue, className: 'x-slider-bar bg-danger' })}
                    {this.renderSliderHandle({ value: currentValue, className: 'x-slider-handle', classNameButton: 'x-slider-handle-button bg-danger' })}
                  </div>
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
