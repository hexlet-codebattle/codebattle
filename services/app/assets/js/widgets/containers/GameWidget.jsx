import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { connect } from 'react-redux';
import Gon from 'gon';
import {
  rightEditorSelector,
  leftEditorSelector,
  editorHeightSelector,
  currentUserSelector,
  leftExecutionOutputSelector,
  rightExecutionOutputSelector,
} from '../selectors';
import userTypes from '../config/userTypes';
import Editor from './Editor';
import LeftEditorToolbar from './LeftEditorToolbar';
import RightEditorToolbar from './RightEditorToolbar';
import GameActionButtons from '../components/GameActionButtons';
import { sendEditorText } from '../middlewares/Game';
import ExecutionOutput from '../components/ExecutionOutput';
import NotificationsHandler from './NotificationsHandler';

// const languages = Gon.getAsset('langs');

class GameWidget extends Component {
  static defaultProps = {
    leftEditor: {},
    rightEditor: {},
  }

  static propTypes = {
    currentUser: PropTypes.shape({
      id: PropTypes.number,
      type: PropTypes.string,
    }).isRequired,
    leftEditor: PropTypes.shape({
      text: PropTypes.string,
    }),
    rightEditor: PropTypes.shape({
      text: PropTypes.string,
    }),
    updateEditorValue: PropTypes.func.isRequired,
  }

  getLeftEditorParams = () => {
    const {
      currentUser, leftEditor, updateEditorValue, leftEditorHeight,
    } = this.props;
    // FIXME: currentUser shouldn't return {} for spectator
    const isPlayer = currentUser.type !== userTypes.spectator;
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
      editorHeight: `${leftEditorHeight}px`,
    };
  }

  getRightEditorParams = () => {
    const { rightEditor, rightEditorHeight } = this.props;
    const editorState = rightEditor;

    return {
      onChange: _.noop,
      editable: false,
      allowCopy: false,
      syntax: editorState.currentLangSlug || 'javascript',
      value: editorState.text,
      name: 'right-editor',
      editorHeight: `${rightEditorHeight}px`,
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
        <div className="row mt-3">
          <div className="col-12 col-md-6" style={{ cursor: 'pointer' }}>
            <LeftEditorToolbar />
            <Editor {...this.getLeftEditorParams()} />
            {/* TODO: move state to parent component */}
            <GameActionButtons disabled={false} />
            <ExecutionOutput output={leftOutput} />
          </div>
          <div className="col-12 col-md-6">
            <RightEditorToolbar />
            <Editor {...this.getRightEditorParams()} />
            {/* TODO: move state to parent component */}
            <GameActionButtons disabled />
            <ExecutionOutput output={rightOutput} />
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
    currentUser: currentUserSelector(state),
    leftEditor,
    rightEditor,
    leftEditorHeight: editorHeightSelector(leftUserId)(state),
    rightEditorHeight: editorHeightSelector(rightUserId)(state),
    leftOutput: leftExecutionOutputSelector(state),
    rightOutput: rightExecutionOutputSelector(state),
  };
};

const mapDispatchToProps = {
  updateEditorValue: sendEditorText,
};

export default connect(mapStateToProps, mapDispatchToProps)(GameWidget);
