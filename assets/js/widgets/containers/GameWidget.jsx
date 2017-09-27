import React, { Component } from 'react'; import PropTypes from 'prop-types';
import _ from 'lodash';
import { connect } from 'react-redux';
import {
  firstEditorSelector,
  secondEditorSelector,
} from '../redux/EditorRedux';
import {
  usersSelector,
  currentUserSelector,
} from '../redux/UserRedux';
import { gameStatusSelector } from '../redux/GameRedux';
import userTypes from '../config/userTypes';
import Editor from './Editor';
import { sendEditorData, editorReady } from '../middlewares/Game';

const setGameStatusTitle = (title) => {
  const element = document.getElementById('game-status');
  if (element) { element.innerHTML = `State: ${title}`; }
};

class GameWidget extends Component {
  static propTypes = {
    currentUser: PropTypes.shape({
      id: PropTypes.number,
      type: PropTypes.string,
    }).isRequired,
    firstEditor: PropTypes.shape({
      value: PropTypes.string,
    }),
    secondEditor: PropTypes.shape({
      value: PropTypes.string,
    }),
    sendData: PropTypes.func.isRequired,
    editorReady: PropTypes.func.isRequired,
  }

  static defaultProps = {
    firstEditor: {},
    secondEditor: {},
  }

  componentDidMount() {
    this.props.editorReady();
  }

  componentWillReceiveProps(newProps, oldProps) {
    if (newProps.gameStatus !== oldProps.gameStatus) {
      setGameStatusTitle(newProps.gameStatus);
    }
  }

  getLeftEditorParams() {
    const { currentUser, firstEditor, secondEditor, sendData } = this.props;
    const isPlayer = currentUser.id !== userTypes.spectator;
    const editable = isPlayer;
    const editorState = currentUser.type === userTypes.secondPlayer ? secondEditor : firstEditor;
    const onChange = isPlayer ?
      (value) => { sendData(value); } :
      _.noop;

    // if (_.isEmpty(editorState)) {
    //   return {
    //     // editable: false,
    //     name: 'left-editor',
    //   };
    // }

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

    // if (_.isEmpty(editorState)) {
    //   return {
    //     // editable: false,
    //     name: 'right-editor',
    //   };
    // }

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

const mapStateToProps = state => ({
  users: usersSelector(state),
  currentUser: currentUserSelector(state),
  firstEditor: firstEditorSelector(state),
  secondEditor: secondEditorSelector(state),
  gameStatus: gameStatusSelector(state),
});

const mapDispatchToProps = dispatch => ({
  // editorActions: bindActionCreators(EditorActions, dispatch),
  sendData: (...args) => { dispatch(sendEditorData(...args)); },
  editorReady: () => { dispatch(editorReady()); },
});

export default connect(mapStateToProps, mapDispatchToProps)(GameWidget);

