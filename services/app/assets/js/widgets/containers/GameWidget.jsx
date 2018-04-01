import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { connect } from 'react-redux';
import {
  rightEditorSelector,
  leftEditorSelector,
  currentUserSelector,
} from '../selectors';
import userTypes from '../config/userTypes';
import Editor from './Editor';
import GameStatusTab from './GameStatusTab';
import { sendEditorText } from '../middlewares/Game';
import ExecutionOutput from '../components/ExecutionOutput';

const Tabs = { editor: 'EDITOR', output: 'OUTPUT' };

class GameWidget extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: Tabs.editor,
    }
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
    sendData: PropTypes.func.isRequired,
  }

  static defaultProps = {
    leftEditor: {},
    rightEditor: {},
    currentTab: Tabs.editor,
  }

  getLeftEditorParams() {
    const {
      currentUser, leftEditor, sendData,
    } = this.props;
    // FIXME: currentUser shouldn't return {} for spectator
    const isPlayer = currentUser.type !== userTypes.spectator;
    const editable = isPlayer;
    const editorState = leftEditor;
    const onChange = isPlayer ?
      (value) => { sendData(value); } :
      _.noop;

    return {
      onChange,
      editable,
      syntax: _.get(editorState, ['currentLang', 'name'], 'javascript'),
      value: editorState.text,
      name: 'left-editor',
    };
  }

  getRightEditorParams() {
    const { rightEditor } = this.props;
    const editorState = rightEditor;

    return {
      onChange: _.noop,
      editable: false,
      allowCopy: false,
      syntax: _.get(editorState, ['currentLang', 'name'], 'javascript'),
      value: editorState.text,
      name: 'right-editor',
    };
  }

  renderTab() {
    const { editorText, outputText } = this.props;

    switch (this.state.currentTab) {
      case Tabs.editor: return <Editor {...this.getLeftEditorParams()} />
      case Tabs.output: return <ExecutionOutput output={outputText} />;
      default: return null;
    }
  }

  render() {
    const { leftEditor } = this.props;
    return (
      <Fragment>
        <div className="row mx-auto">
          <div className="col-md-12">
            <GameStatusTab />
          </div>
        </div>
        <div className="row my-2">
          <div className="col-6" style={{ height: '500px' }}>
                {this.renderTab()}
                <ul className="nav nav-tabs">
                  {_.map(Tabs, (value, key) => {
                    const active = this.state.currentTab === value ? 'active' : '';
                    return (
                      <li className="nav-item" key={key}>
                        <a
                          role="button"
                          className={`nav-link disabled ${active}`}
                          onClick={() => this.setState({ currentTab: value })}
                        >
                          {value}
                        </a>
                      </li>
                    );
                  })}
                </ul>
                <div className="row mx-auto">
                  <div className="col-md-6">
                    <p> Template: {_.get(leftEditor, ['currentLang', 'solution_template'])}</p>
                  </div>
            </div>
          </div>
          <div className="col-6">
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

const mapDispatchToProps = dispatch => ({
  sendData: (...args) => { dispatch(sendEditorText(...args)); },
});

export default connect(mapStateToProps, mapDispatchToProps)(GameWidget);
