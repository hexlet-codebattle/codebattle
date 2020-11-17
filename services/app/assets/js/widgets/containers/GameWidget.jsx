import React, { Component } from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import * as selectors from '../selectors';
import Editor from './Editor';
import EditorToolbar from './EditorsToolbars/EditorToolbar';
import GameActionButtons from '../components/GameActionButtons';
import * as GameActions from '../middlewares/Game';
import ExecutionOutput from '../components/ExecutionOutput/ExecutionOutput';
import NotificationsHandler from './NotificationsHandler';
import editorModes from '../config/editorModes';
import GameStatusCodes from '../config/gameStatusCodes';

class GameWidget extends Component {
  static defaultProps = {
    leftEditor: {},
    rightEditor: {},
  };

  getLeftEditorParams = () => {
    const {
      isStoredGame,
      currentUserId,
      players,
      leftEditor,
      updateEditorValue,
      checkResult,
      leftEditorHeight,
      leftEditorsMode,
      theme,
    } = this.props;

    // FIXME: currentUser shouldn't return {} for spectator
    const isPlayer = _.hasIn(players, currentUserId);
    const editable = !isStoredGame && isPlayer;
    const editorState = leftEditor;
    const onChange = editable
      ? value => {
          updateEditorValue(value);
        }
      : _.noop;

    return {
      onChange,
      editable,
      syntax: editorState.currentLangSlug || 'javascript',
      value: editorState.text,
      editorHeight: leftEditorHeight,
      mode: editable ? leftEditorsMode : editorModes.default,
      checkResult: editable ? checkResult : _.noop,
      theme,
    };
  };

  getRightEditorParams = () => {
    const { rightEditor, rightEditorHeight } = this.props;
    const editorState = rightEditor;

    return {
      onChange: _.noop,
      editable: false,
      mode: editorModes.default,
      syntax: editorState.currentLangSlug || 'javascript',
      value: editorState.text,
      editorHeight: rightEditorHeight,
    };
  };

  renderGameActionButtons = (editor, disabled) => <GameActionButtons disabled={disabled} editorUser={editor.userId} />;

  getToolbarParams = editor => {
    const { currentUserId, players, isStoredGame } = this.props;
    const isPlayer = editor.userId === currentUserId;

    return {
      isSpectator: isStoredGame || !isPlayer,
      player: players[editor.userId],
      editor,
    };
  };

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
        <div className="col-12 col-md-6 p-1">
          <div className="card overflow-hidden" data-guide-id="LeftEditor">
            <EditorToolbar
              {...this.getToolbarParams(leftEditor)}
              toolbarClassNames="btn-toolbar justify-content-between align-items-center m-1"
              editorSettingClassNames="btn-group align-items-center m-1"
              userInfoClassNames="btn-group align-items-center justify-content-end m-1"
            />
            <Editor {...this.getLeftEditorParams()} />
            {/* TODO: move state to parent component */}
            {!isStoredGame && this.renderGameActionButtons(leftEditor, false)}
            <ExecutionOutput output={leftOutput} id="1" />
          </div>
        </div>
        <div className="col-12 col-md-6 p-1">
          <div className="card overflow-hidden">
            <EditorToolbar
              {...this.getToolbarParams(rightEditor)}
              toolbarClassNames="btn-toolbar justify-content-between align-items-center m-1 flex-row-reverse"
              editorSettingClassNames="btn-group align-items-center m-1 flex-row-reverse justify-content-end"
              userInfoClassNames="btn-group align-items-center justify-content-end m-1 flex-row-reverse"
            />
            <Editor {...this.getRightEditorParams()} />
            {/* TODO: move state to parent component */}
            {!isStoredGame && this.renderGameActionButtons(rightEditor, true)}
            <ExecutionOutput output={rightOutput} id="2" />
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
  updateEditorValue: GameActions.sendEditorText,
  checkResult: GameActions.checkGameResult,
};

export default connect(mapStateToProps, mapDispatchToProps)(GameWidget);
