import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { connect } from 'react-redux';
import Gon from 'gon';
import {
  rightEditorSelector,
  leftEditorSelector,
  currentUserSelector,
} from '../selectors';
import userTypes from '../config/userTypes';
import Editor from './Editor';
import LeftEditorToolbar from './LeftEditorToolbar';
import RightEditorToolbar from './RightEditorToolbar';
import GameActionButtons from '../components/GameActionButtons';
import { sendEditorText } from '../middlewares/Game';
import ExecutionOutput from '../components/ExecutionOutput';

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
      currentUser, leftEditor, updateEditorValue,
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
      syntax: _.get(editorState, ['currentLangSlug', 'name'], 'javascript'),
      value: editorState.text,
      name: 'left-editor',
    };
  }

  getRightEditorParams = () => {
    const { rightEditor } = this.props;
    const editorState = rightEditor;

    return {
      onChange: _.noop,
      editable: false,
      allowCopy: false,
      syntax: _.get(editorState, ['currentLangSlug', 'name'], 'javascript'),
      value: editorState.text,
      name: 'right-editor',
    };
  }

  render() {
    const { leftEditor, rightEditor, outputText } = this.props;
    if (leftEditor === null || rightEditor === null) {
      // FIXME: render loader
      return null;
    }
    return (
      <Fragment>
        <div className="row my-2">
          <div className="col-12 col-md-6" style={{ cursor: 'pointer' }}>
            <LeftEditorToolbar />
            <Editor {...this.getLeftEditorParams()} />
            <GameActionButtons output={outputText} />
            <ExecutionOutput output={outputText} />
          </div>
          <div className="col-12 col-md-6">
            <RightEditorToolbar />
            <Editor {...this.getRightEditorParams()} />
          </div>
        </div>
      </Fragment>
    );
  }
}

const mapStateToProps = state => ({
  currentUser: currentUserSelector(state),
  leftEditor: leftEditorSelector(state),
  rightEditor: rightEditorSelector(state),
  outputText: state.executionOutput,
});

const mapDispatchToProps = {
  updateEditorValue: sendEditorText,
};

export default connect(mapStateToProps, mapDispatchToProps)(GameWidget);
