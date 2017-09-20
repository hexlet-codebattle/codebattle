import React, { Component } from 'react'; import PropTypes from 'prop-types';
import _ from 'lodash';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  firstEditorSelector,
  secondEditorSelector,
} from '../redux/EditorRedux';
import {
  usersSelector,
  currentUserSelector,
} from '../redux/UserRedux';
import { EditorActions } from '../redux/Actions';
import userTypes from '../config/userTypes';
import Editor from './Editor';
import { sendEditorData } from '../middlewares/Editor';


class GameWidget extends Component {
  static propTypes = {
    currentUser: PropTypes.shape({
      id: PropTypes.number,
      type: PropTypes.string,
    }).isRequired,
    firstEditor: PropTypes.shape({
      value: PropTypes.string,
    }).isRequired,
    secondEditor: PropTypes.shape({
      value: PropTypes.string,
    }).isRequired,
    sendEditorData: PropTypes.func.isRequired,
  }

  getLeftEditorParams() {
    const { currentUser, firstEditor, secondEditor, sendEditorData } = this.props;
    const isPlayer = currentUser.id !== userTypes.spectator;
    const editable = isPlayer;
    const editorState = currentUser.type === userTypes.secondPlayer ? secondEditor : firstEditor;
    const onChange = isPlayer ?
      (value) => { sendEditorData(currentUser.id, value); } :
      _.noop;

    return {
      onChange,
      editable,
      value: editorState.value,
      name: 'left-editor',
    };
  }

  getRightEditorParams() {
    const { currentUser, firstEditor, secondEditor } = this.props;
    const editorState = currentUser.type === userTypes.secondPlayer ? firstEditor : secondEditor;

    return {
      onChange: _.noop,
      editable: false,
      value: editorState.value,
      name: 'right-editor',
    };
  }

  render() {
    return (
      <div className="row mt-3 mx-auto">
        <div className="col-md-6">
          <Editor {...this.getLeftEditorParams()} />
        </div>
        <div className="col-md-6">
          <Editor {...this.getRightEditorParams()} />
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    users: usersSelector(state),
    currentUser: currentUserSelector(state),
    firstEditor: firstEditorSelector(state),
    secondEditor: secondEditorSelector(state),
  };
};

const mapDispatchToProps = dispatch => ({
  // editorActions: bindActionCreators(EditorActions, dispatch),
  sendEditorData: (...args) => { dispatch(sendEditorData(...args)) },
});

export default connect(mapStateToProps, mapDispatchToProps)(GameWidget);

