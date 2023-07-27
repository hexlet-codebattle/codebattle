/* eslint-disable no-bitwise */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import MonacoEditor from 'react-monaco-editor';
import { registerRulesForLanguage } from 'monaco-ace-tokenizer';
import { initVimMode } from 'monaco-vim';
import { connect } from 'react-redux';

import { gameModeSelector } from '../selectors/index';
import languages from '../config/languages';
import GameRoomModes from '../config/gameModes';
import sound from '../lib/sound';
import { actions } from '../slices';
import getLanguageTabSize, { shouldReplaceTabsWithSpaces } from '../utils/editor';

class Editor extends PureComponent {
  static propTypes = {
    value: PropTypes.string,
    editable: PropTypes.bool,
    syntax: PropTypes.string,
    onChange: PropTypes.func,
    mode: PropTypes.string.isRequired,
    mute: PropTypes.bool,
  };

  static defaultProps = {
    value: '',
    editable: false,
    onChange: null,
    syntax: 'js',
    mute: false,
  };

  // eslint-disable-next-line react/sort-comp
  notIncludedSyntaxHightlight = new Set(['haskell', 'elixir']);

  ctrPlusS = null

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
      fontSize: 16,
      scrollBeyondLastLine: false,
      selectOnLineNumbers: true,
      minimap: {
        enabled: false,
      },
      readOnly: !props.editable,
      contextmenu: props.editable,
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

  async componentDidUpdate(prevProps) {
    const { syntax, mode, editable } = this.props;
    if (mode !== prevProps.mode) {
      if (this.currentMode) {
        this.currentMode.dispose();
      }
      this.statusBarRef.current.innerHTML = '';
      this.currentMode = this.modes[mode]();
    }
    if (prevProps.editable !== editable) {
      this.options = {
        ...this.options,
        readOnly: !editable,
        contextMenu: editable,
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

    // fix flickering in editor
    model.forceTokenization(model.getLineCount());
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.ctrPlusS);
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

  editorDidMount = (editor, monaco) => {
    this.editor = editor;
    this.monaco = monaco;
    const { editable, gameMode } = this.props;
    const isTournament = gameMode === GameRoomModes.tournament;
    const isBuilder = gameMode === GameRoomModes.builder;

    if (editable && !isTournament && !isBuilder) {
      this.editor.focus();
    } else if (editable && isTournament) {
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
      this.editor.onDidChangeCursorSelection(() => {
        const { column, lineNumber } = this.editor.getPosition();
        this.editor.setPosition({ lineNumber, column });
      });
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
      value, syntax, onChange, theme,
    } = this.props;
    // FIXME: move here and apply mapping object
    const mappedSyntax = languages[syntax];
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
          className="bg-dark text-white px-1 position-absolute"
          style={{ bottom: '40px' }}
        />
      </>
    );
  }
}

const mapStateToProps = state => {
  const gameMode = gameModeSelector(state);
  return {
    gameMode,
    mute: state.userSettings.mute,
  };
};

const mapDispatchToProps = { toggleMuteSound: actions.toggleMuteSound };

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
