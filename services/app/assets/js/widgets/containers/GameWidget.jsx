import React, { Component, useState } from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import cn from 'classnames';
import * as selectors from '../selectors';
import Editor from './Editor';
import EditorToolbar from './EditorsToolbars/EditorToolbar';
import * as GameActions from '../middlewares/Game';
import OutputClicker from './OutputClicker';
import editorModes from '../config/editorModes';
import GameStatusCodes from '../config/gameStatusCodes';
import OutputTab from '../components/ExecutionOutput/OutputTab';
import Output from '../components/ExecutionOutput/Output';

const RightSide = ({ output, children }) => {
  const [showTab, setShowTab] = useState('editor');
  const over = showTab === 'editor' ? '' : 'overflow-auto';
  const isShowOutput = output && output.status;
  return (
    <>
      <div className={`h-100 ${over}`} id="editor">
        {showTab === 'editor' ? <div className="h-100">{children}</div>
        : (
          <div className="h-auto">
            {isShowOutput && <Output sideOutput={output} />}
          </div>
)}

      </div>
      <nav>
        <div className="nav nav-tabs bg-gray text-uppercase text-center font-weight-bold" id="nav-tab" role="tablist">
          <a
            className={cn(
                'nav-item nav-link flex-grow-1 text-black rounded-0 px-5',
                { active: showTab === 'editor' },
              )}
            href="#Editor"
            onClick={e => {
              e.preventDefault();
              setShowTab('editor');
            }}
          >
            Editor
          </a>
          <a
            className={cn(
              'nav-item nav-link flex-grow-1 text-black rounded-0 p-2 block',
                          { active: showTab === 'output' },
                        )}
            href="#Output"
            onClick={e => {
              e.preventDefault();
              setShowTab('output');
            }}
          >
            {isShowOutput && <OutputTab sideOutput={output} side="right" />}
          </a>
        </div>
      </nav>
    </>
);
};
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
    leftEditor, rightEditor, rightOutput,
} = this.props;
    if (leftEditor === null || rightEditor === null) {
      // FIXME: render loader
      return null;
    }

    return (
      <>
        <div className="col-12 col-lg-6 p-1">
          <div className="card h-100 position-relative" style={{ minHeight: '470px' }} data-guide-id="LeftEditor">
            <EditorToolbar
              {...this.getToolbarParams(leftEditor)}
              toolbarClassNames="btn-toolbar align-items-center p-2"
              editorSettingClassNames="btn-group align-items-center mr-2"
              userInfoClassNames="btn-group align-items-center justify-content-end p-2"
            />
            <Editor {...this.getLeftEditorParams()} />

            {/* TODO: move state to parent component */}
          </div>
        </div>
        <div className="col-12 col-lg-6 p-1">
          <div className="card h-100" style={{ minHeight: '470px' }} data-guide-id="LeftEditor">
            <EditorToolbar
              {...this.getToolbarParams(rightEditor)}
              toolbarClassNames="btn-toolbar justify-content-between align-items-center flex-row-reverse p-2"
              editorSettingClassNames="btn-group align-items-center m-1 flex-row-reverse justify-content-end"
              userInfoClassNames="btn-group align-items-center justify-content-end flex-row-reverse mt-1"
            />
            <RightSide output={rightOutput}>
              <Editor {...this.getRightEditorParams()} />
            </RightSide>
          </div>
        </div>
        <OutputClicker />
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
