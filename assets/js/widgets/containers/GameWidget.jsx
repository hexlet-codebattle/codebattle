import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { connect } from 'react-redux';
import {
  rightEditorSelector,
  leftEditorSelector,
} from '../redux/EditorRedux';
import { currentUserSelector } from '../redux/UserRedux';
import userTypes from '../config/userTypes';
import Editor from './Editor';
import GameStatusTab from './GameStatusTab';
import { sendEditorData } from '../middlewares/Game';

class GameWidget extends Component {
  static propTypes = {
    currentUser: PropTypes.shape({
      id: PropTypes.number,
      type: PropTypes.string,
    }).isRequired,
    leftEditor: PropTypes.shape({
      value: PropTypes.string,
    }),
    rightEditor: PropTypes.shape({
      value: PropTypes.string,
    }),
    sendData: PropTypes.func.isRequired,
  }

  static defaultProps = {
    leftEditor: {},
    rightEditor: {},
  }

  getLeftEditorParams() {
    const {
      currentUser, leftEditor, sendData,
    } = this.props;
    const isPlayer = currentUser.id !== userTypes.spectator;
    const editable = isPlayer;
    const editorState = leftEditor;
    const onChange = isPlayer ?
      (value) => { sendData(value); } :
      _.noop;

    return {
      onChange,
      editable,
      lang: editorState.currentLang,
      value: editorState.value,
      name: 'left-editor',
    };
  }

  getRightEditorParams() {
    const { rightEditor } = this.props;
    const editorState = rightEditor;

    return {
      onChange: _.noop,
      editable: false,
      lang: editorState.currentLang,
      value: editorState.value,
      name: 'right-editor',
    };
  }

  render() {
    return (
      <div>
        <div className="row mx-auto">
          <div className="col-md-12">
            <GameStatusTab />
          </div>
        </div>
        <div className="row mx-auto">
          <div className="col-md-6">
            <Editor {...this.getLeftEditorParams()} />
          </div>
          <div className="col-md-6">
            <Editor {...this.getRightEditorParams()} />
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  currentUser: currentUserSelector(state),
  leftEditor: leftEditorSelector(state),
  rightEditor: rightEditorSelector(state),
});

const mapDispatchToProps = dispatch => ({
  // editorActions: bindActionCreators(EditorActions, dispatch),
  sendData: (...args) => { dispatch(sendEditorData(...args)); },
});

export default connect(mapStateToProps, mapDispatchToProps)(GameWidget);

