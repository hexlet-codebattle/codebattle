import React, { Component, Fragment } from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
// import Gon from 'gon';
import {
  rightEditorSelector,
  leftEditorSelector,
  editorHeightSelector,
  currentUserIdSelector,
  gamePlayersSelector,
  leftExecutionOutputSelector,
  rightExecutionOutputSelector,
  editorsModeSelector,
  editorsThemeSelector,
} from '../selectors';
import Editor from './Editor';
import LeftEditorToolbar from './LeftEditorToolbar';
import RightEditorToolbar from './RightEditorToolbar';
import GameActionButtons from '../components/GameActionButtons';
import { sendEditorText } from '../middlewares/Game';
import ExecutionOutput from '../components/ExecutionOutput';
import NotificationsHandler from './NotificationsHandler';
import editorModes from '../config/editorModes';
import editorThemes from '../config/editorThemes';

// const languages = Gon.getAsset('langs');

class GameWidget extends Component {
  static defaultProps = {
    leftEditor: {},
    rightEditor: {},
  }

  getLeftEditorParams = () => {
    const {
      currentUserId, players, leftEditor, updateEditorValue, leftEditorHeight, leftEditorsMode, theme
    } = this.props;

    // FIXME: currentUser shouldn't return {} for spectator
    const isPlayer = _.hasIn(players, currentUserId);
    const editable = isPlayer;
    const editorState = leftEditor;
    const onChange = isPlayer
      ? (value) => { updateEditorValue(value); }
      : _.noop;

    // const syntax = _.find(languages, { slug: editorState. });
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

  render() {
    const {
      leftEditor, rightEditor, leftOutput, rightOutput,
    } = this.props;
    if (leftEditor === null || rightEditor === null) {
      // FIXME: render loader
      return null;
    }
    return (
      <Fragment>
          <div className="row no-gutters">
            <div className="col-12 col-md-6 p-1">
              <div className="card">
                <LeftEditorToolbar />
                <Editor {...this.getLeftEditorParams()} />
                {/* TODO: move state to parent component */}
                <GameActionButtons disabled={false} editorUser={leftEditor.userId} />
                <ExecutionOutput output={leftOutput} id={"1"}/>
              </div>
            </div>
            <div className="col-12 col-md-6 p-1">
              <div className="card">
                <RightEditorToolbar />
                <Editor {...this.getRightEditorParams()} />
                {/* TODO: move state to parent component */}
                <GameActionButtons disabled editorUser={rightEditor.userId} />
                <ExecutionOutput output={rightOutput} id={"2"}/>
              </div>
            </div>
          </div>
        <NotificationsHandler />
      </Fragment>
    );
  }
}

const mapStateToProps = (state) => {
  const leftEditor = leftEditorSelector(state);
  const rightEditor = rightEditorSelector(state);
  const leftUserId = _.get(leftEditor, ['userId'], null);
  const rightUserId = _.get(rightEditor, ['userId'], null);

  return {
    currentUserId: currentUserIdSelector(state),
    players: gamePlayersSelector(state),
    leftEditor,
    rightEditor,
    leftEditorHeight: editorHeightSelector(leftUserId)(state),
    rightEditorHeight: editorHeightSelector(rightUserId)(state),
    leftOutput: leftExecutionOutputSelector(state),
    rightOutput: rightExecutionOutputSelector(state),
    leftEditorsMode: editorsModeSelector(leftUserId)(state),
    theme: editorsThemeSelector(leftUserId)(state),
  };
};

const mapDispatchToProps = {
  updateEditorValue: sendEditorText,
};

export default connect(mapStateToProps, mapDispatchToProps)(GameWidget);
