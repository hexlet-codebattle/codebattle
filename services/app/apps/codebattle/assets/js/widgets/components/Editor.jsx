/* eslint-disable no-bitwise */
import React, { PureComponent } from 'react';

import cn from 'classnames';
import { registerRulesForLanguage } from 'monaco-ace-tokenizer';
import { initVimMode } from 'monaco-vim';
import PropTypes from 'prop-types';
import MonacoEditor from 'react-monaco-editor';
import { connect } from 'react-redux';

import editorThemes from '../config/editorThemes';
import editorUserTypes from '../config/editorUserTypes';
import GameRoomModes from '../config/gameModes';
import languages from '../config/languages';
import sound from '../lib/sound';
import { addCursorListeners } from '../middlewares/Game';
import { gameIdSelector, gameModeSelector } from '../selectors/index';
import { actions } from '../slices';
import getLanguageTabSize, { shouldReplaceTabsWithSpaces } from '../utils/editor';

import Loading from './Loading';

class Editor extends PureComponent {
  static propTypes = {
    gameId: PropTypes.number,
    userId: PropTypes.number,
    value: PropTypes.string,
    editable: PropTypes.bool,
    syntax: PropTypes.string,
    onChange: PropTypes.func,
    mode: PropTypes.string.isRequired,
    mute: PropTypes.bool,
    fontSize: PropTypes.number,
  };

  static defaultProps = {
    gameId: null,
    userId: null,
    value: '',
    editable: false,
    onChange: null,
    syntax: 'js',
    mute: false,
    fontSize: 16,
  };

  // eslint-disable-next-line react/sort-comp
  notIncludedSyntaxHightlight = new Set(['haskell', 'elixir']);

  ctrPlusS = null

  remoteKeys = []

  constructor(props) {
    super(props);
    this.statusBarRef = React.createRef();
    const convertRemToPixels = rem => rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
    // statusBarHeight = lineHeight = current fontSize * 1.5
    this.statusBarHeight = convertRemToPixels(1) * 1.5;
    this.options = {
      tabSize: getLanguageTabSize(props.syntax),
      insertSpaces: shouldReplaceTabsWithSpaces(props.syntax),
      lineNumbersMinChars: 3,
      fontSize: props.fontSize || 16,
      scrollBeyondLastLine: false,
      selectOnLineNumbers: true,
      minimap: {
        enabled: false,
      },
      parameterHints: {
        enabled: false,
      },
      readOnly: !props.editable,
      contextmenu: props.editable,
    };

    this.state = {
      remote: {
        cursor: {},
        selection: {},
      },
    };
    /** @param {KeyboardEvent} e */
    this.ctrPlusS = e => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) e.preventDefault();
    };
  }

  async componentDidMount() {
    const {
      mode,
      syntax,
      checkResult,
      toggleMuteSound,
    } = this.props;

    this.modes = {
      default: () => null,
      vim: () => initVimMode(this.editor, this.statusBarRef.current),
    };
    await this.updateHightLightForNotIncludeSyntax(syntax);
    this.currentMode = this.modes[mode]();

    if (checkResult) {
      this.editor.addAction({
        id: 'codebattle-check-keys',
        label: 'Codebattle check start',
        keybindings: [this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Enter],
        run: () => {
          if (!this.options.readOnly) {
            checkResult();
          }
        },
      });
    }

    this.editor.addAction({
      id: 'codebattle-mute-keys',
      label: 'Codebattle mute sound',
      keybindings: [this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KEY_M],
      run: () => {
        const { mute } = this.props;
        // eslint-disable-next-line no-unused-expressions
        mute ? sound.toggle() : sound.toggle(0);
        toggleMuteSound();
      },
    });
    window.addEventListener('keydown', this.ctrPlusS);
  }

  async componentDidUpdate(prevProps, prevState) {
    const { remote } = this.state;
    const {
      syntax,
      mode,
      editable,
      loading = false,
      userId,
      gameId,
      gameMode,
      fontSize,
    } = this.props;

    const isBuilder = gameMode === GameRoomModes.builder;
    const isHistory = gameMode === GameRoomModes.history;

    if (!gameId || prevProps.gameId !== gameId) {
      this.clearCursorListeners();
      this.clearCursorListeners = () => {};
    }

    if (!isBuilder && !isHistory && gameId && prevProps.gameId !== gameId) {
      const clearCursorListeners = addCursorListeners(
        userId,
        this.updateRemoteCursorPosition,
        this.updateRemoteCursorSelection,
      );

      this.clearCursorListeners = clearCursorListeners;
    }

    if (mode !== prevProps.mode) {
      if (this.currentMode) {
        this.currentMode.dispose();
      }
      this.statusBarRef.current.innerHTML = '';
      this.currentMode = this.modes[mode]();
    }
    if (prevProps.fontSize !== fontSize) {
      this.options = {
        ...this.options,
        fontSize: fontSize || 16,
      };
      this.editor.updateOptions(this.options);
    }
    if (prevProps.editable !== editable || prevProps.loading !== loading) {
      this.options = {
        ...this.options,
        readOnly: !editable || loading,
        contextMenu: editable && !loading,
        scrollbar: {
          useShadows: false,
          verticalHasArrows: true,
          horizontalHasArrows: true,
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 17,
          horizontalScrollbarSize: 17,
          arrowSize: 30,
        },
      };
      this.editor.updateOptions(this.options);
    }

    const model = this.editor.getModel();

    if (prevProps.syntax !== syntax) {
      model.updateOptions({ tabSize: getLanguageTabSize(syntax), insertSpaces: shouldReplaceTabsWithSpaces(syntax) });

      await this.updateHightLightForNotIncludeSyntax(syntax);
    }

    if (
      prevState.remote !== remote
        && remote.cursor.range
        && remote.selection.range
    ) {
      this.remoteKeys = this.editor.deltaDecorations(this.remoteKeys, Object.values(remote));
    }

    // fix flickering in editor
    model.forceTokenization(model.getLineCount());
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.ctrPlusS);

    this.clearCursorListeners();
  }

  updateHightLightForNotIncludeSyntax = async syntax => {
    if (this.notIncludedSyntaxHightlight.has(syntax)) {
      const { default: HighlightRules } = await import(
        `monaco-ace-tokenizer/lib/ace/definitions/${syntax}`
      );
      this.notIncludedSyntaxHightlight.delete(syntax);
      this.monaco.languages.register({
        id: syntax,
      });
      registerRulesForLanguage(syntax, new HighlightRules());
    }
  };

  handleResize = () => this.editor.layout();

  handleChangeCursorSelection = e => {
    const { editable, isTournamentGame, onChangeCursorSelection } = this.props;

    if (!editable || isTournamentGame) {
      const { column, lineNumber } = this.editor.getPosition();
      this.editor.setPosition({ lineNumber, column });
    } else if (editable && onChangeCursorSelection) {
      const startOffset = this.editor.getModel().getOffsetAt(e.selection.getStartPosition());
      const endOffset = this.editor.getModel().getOffsetAt(e.selection.getEndPosition());
      onChangeCursorSelection(startOffset, endOffset);
    }
  };

  handleChangeCursorPosition = e => {
    const { editable, onChangeCursorPosition } = this.props;

    if (editable && onChangeCursorPosition) {
      const offset = this.editor.getModel().getOffsetAt(e.position);
      onChangeCursorPosition(offset);
    }
  };

  updateRemoteCursorSelection = (startOffset, endOffset) => {
    const { editable, userType } = this.props;
    const userClassName = userType === editorUserTypes.opponent
      ? 'cb-remote-opponent'
      : 'cb-remote-player';

    if (!editable) {
      const startPosition = this.editor.getModel().getPositionAt(startOffset);
      const endPosition = this.editor.getModel().getPositionAt(endOffset);

      const startColumn = startPosition.column;
      const startLineNumber = startPosition.lineNumber;
      const endColumn = endPosition.column;
      const endLineNumber = endPosition.lineNumber;

      const selection = {
        range: new this.monaco.Range(
          startLineNumber,
          startColumn,
          endLineNumber,
          endColumn,
        ),
        options: { className: `cb-editor-remote-selection ${userClassName}` },
      };

      this.setState(state => ({
        remote: { ...state.remote, selection },
      }));
    }
  }

  updateRemoteCursorPosition = offset => {
    const { editable, userType } = this.props;
    const position = this.editor.getModel().getPositionAt(offset);
    const userClassName = userType === editorUserTypes.opponent
      ? 'cb-remote-opponent'
      : 'cb-remote-player';

    if (!editable) {
      const cursor = {
        range: new this.monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column,
        ),
        options: { className: `cb-editor-remote-cursor ${userClassName}` },
      };

      this.setState(state => ({
        remote: {
          ...state.remote,
          cursor,
        },
      }));
    }
  }

  clearCursorListeners = () => {};

  editorDidMount = (editor, monaco) => {
    this.editor = editor;
    this.monaco = monaco;
    const {
      isTournamentGame,
      editable,
      gameMode,
      userId,
      gameId,
    } = this.props;
    const isBuilder = gameMode === GameRoomModes.builder;
    const isHistory = gameMode === GameRoomModes.history;

    this.editor.onDidChangeCursorSelection(this.handleChangeCursorSelection);
    this.editor.onDidChangeCursorPosition(this.handleChangeCursorPosition);

    if (!isBuilder && !isHistory && gameId) {
      const clearCursorListeners = addCursorListeners(
        userId,
        this.updateRemoteCursorPosition,
        this.updateRemoteCursorSelection,
      );

      this.clearCursorListeners = clearCursorListeners;
    }

    if (editable && !isTournamentGame && !isBuilder) {
      this.editor.focus();
    } else if (editable && isTournamentGame) {
      this.editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_V,
        () => null,
      );

      this.editor.focus();
    } else {
      // disable copying for spectator
      this.editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_C,
        () => null,
      );
      // this.editor.onDidChangeCursorSelection(() => {
      //   const { column, lineNumber } = this.editor.getPosition();
      //   this.editor.setPosition({ lineNumber, column });
      // });
    }

    // this.editor.getModel().updateOptions({ tabSize: this.tabSize });

    this.editor.addCommand(
      this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Enter,
      () => null,
    );

    this.editor.addCommand(
      this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KEY_M,
      () => null,
    );

    window.addEventListener('resize', this.handleResize);
  };

  render() {
    const {
      value, syntax, onChange, theme, loading = false,
    } = this.props;
    // FIXME: move here and apply mapping object
    const mappedSyntax = languages[syntax];
    const statusBarClassName = cn('position-absolute px-1', {
      'bg-dark text-white': theme === editorThemes.dark,
      'bg-white text-dark': theme === editorThemes.light,
    });

    const loadingClassName = cn('position-absolute align-items-center justify-content-center w-100 h-100', {
      'd-flex cb-loading-background': loading,
      'd-none': !loading,
    });

    return (
      <>
        <MonacoEditor
          theme={theme}
          options={this.options}
          width="100%"
          height="100%"
          language={mappedSyntax}
          editorDidMount={this.editorDidMount}
          value={value}
          onChange={onChange}
          data-guide-id="Editor"
        />
        <div
          ref={this.statusBarRef}
          className={statusBarClassName}
          style={{ bottom: '40px' }}
        />
        <div className={loadingClassName}><Loading /></div>
      </>
    );
  }
}

const mapStateToProps = state => {
  const gameId = gameIdSelector(state);
  const gameMode = gameModeSelector(state);
  return {
    gameId,
    gameMode,
    mute: state.user.settings.mute,
  };
};

const mapDispatchToProps = { toggleMuteSound: actions.toggleMuteSound };

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
