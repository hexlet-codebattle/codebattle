import React, { Component } from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
// import Gon from 'gon';
import * as selectors from '../selectors';
import Editor from './Editor';
import LeftEditorToolbar from './EditorsToolbars/LeftEditorToolbar';
import RightEditorToolbar from './EditorsToolbars/RightEditorToolbar';
import GameActionButtons from '../components/GameActionButtons';
import { sendEditorText } from '../middlewares/Game';
import ExecutionOutput from '../components/ExecutionOutput';
import NotificationsHandler from './NotificationsHandler';
import editorModes from '../config/editorModes';
import GameStatusCodes from '../config/gameStatusCodes';

class GameWidget extends Component {
  static defaultProps = {
    leftEditor: {},
    rightEditor: {},
  }

  getLeftEditorParams = () => {
    const {
      isStoredGame,
      currentUserId,
      players,
      leftEditor,
      updateEditorValue,
      leftEditorHeight,
      leftEditorsMode,
      theme,
    } = this.props;

    // FIXME: currentUser shouldn't return {} for spectator
    const isPlayer = _.hasIn(players, currentUserId);
    const editable = !isStoredGame && isPlayer;
    const editorState = leftEditor;
    const onChange = editable
      ? value => { updateEditorValue(value); }
      : _.noop;

    return {
      onChange,
      editable,
      syntax: editorState.currentLangSlug || 'javascript',
      value: editorState.text,
      name: 'left-editor',
      editorHeight: leftEditorHeight,
      mode: editable ? leftEditorsMode : editorModes.default,
      theme,
    };
  }

  getRightEditorParams = () => {
    const { rightEditor, rightEditorHeight } = this.props;
    const editorState = rightEditor;

    return {
      onChange: _.noop,
      editable: false,
      mode: editorModes.default,
      syntax: editorState.currentLangSlug || 'javascript',
      value: editorState.text,
      name: 'right-editor',
      editorHeight: rightEditorHeight,
    };
  }

  renderGameActionButtons = (editor, disabled) => (
    <GameActionButtons
      disabled={disabled}
      editorUser={editor.userId}
    />
  );

  render() {
    const {
      isStoredGame, leftEditor, rightEditor, leftOutput, rightOutput,
    } = this.props;
    if (leftEditor === null || rightEditor === null) {
      // FIXME: render loader
      return null;
    }
    return (
      <>
        <div className="row no-gutters">
          <div className="col-12 col-md-6 p-1">
            <div className="card">
              <LeftEditorToolbar />
              <Editor {...this.getLeftEditorParams()} />
              {/* TODO: move state to parent component */}
              { !isStoredGame && this.renderGameActionButtons(leftEditor, false) }
              <ExecutionOutput output={leftOutput} id="1" />
            </div>
          </div>
          <div className="col-12 col-md-6 p-1">
            <div className="card">
              <RightEditorToolbar />
              <Editor {...this.getRightEditorParams()} />
              {/* TODO: move state to parent component */}
              { !isStoredGame && this.renderGameActionButtons(rightEditor, true) }
              <ExecutionOutput output={rightOutput} id="2" />
            </div>
          </div>
        </div>
        <NotificationsHandler />
      </>
    );
  }
}

const mapStateToProps = state => {
  const leftEditor = selectors.leftEditorSelector(state);
  const rightEditor = selectors.rightEditorSelector(state);
  const leftUserId = _.get(leftEditor, ['userId'], null);
  const rightUserId = _.get(rightEditor, ['userId'], null);

  return {
    currentUserId: selectors.currentUserIdSelector(state),
    players: selectors.gamePlayersSelector(state),
    leftEditor,
    rightEditor,
    leftEditorHeight: selectors.editorHeightSelector(leftUserId)(state),
    rightEditorHeight: selectors.editorHeightSelector(rightUserId)(state),
    leftOutput: selectors.leftExecutionOutputSelector(state),
    rightOutput: selectors.rightExecutionOutputSelector(state),
    leftEditorsMode: selectors.editorsModeSelector(leftUserId)(state),
    theme: selectors.editorsThemeSelector(leftUserId)(state),
    isStoredGame: selectors.gameStatusSelector(state).status === GameStatusCodes.stored,
  };
};

const mapDispatchToProps = {
  updateEditorValue: sendEditorText,
};

export default connect(mapStateToProps, mapDispatchToProps)(GameWidget);
