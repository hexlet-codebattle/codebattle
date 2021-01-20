/* eslint-disable no-bitwise */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import MonacoEditor from 'react-monaco-editor';
import { registerRulesForLanguage } from 'monaco-ace-tokenizer';
import { initVimMode } from 'monaco-vim';
import { connect } from 'react-redux';

import { gameTypeSelector } from '../selectors/index';
import languages from '../config/languages';
import GameTypeCodes from '../config/gameTypeCodes';

class Editor extends PureComponent {
  static propTypes = {
    value: PropTypes.string,
    editable: PropTypes.bool,
    syntax: PropTypes.string,
    onChange: PropTypes.func,
    mode: PropTypes.string.isRequired,
  };

  static defaultProps = {
    value: '',
    editable: false,
    onChange: null,
    syntax: 'javascript',
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
    const { mode, syntax } = this.props;
    this.modes = {
      default: () => null,
      vim: () => initVimMode(this.editor, this.statusBarRef.current),
    };
    await this.updateHightLightForNotIncludeSyntax(syntax);
    this.currentMode = this.modes[mode]();
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
    }
    if (prevProps.syntax !== syntax) {
      await this.updateHightLightForNotIncludeSyntax(syntax);
    }
    // fix flickering in editor
    const model = this.editor.getModel();
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
    const { editable, checkResult, gameType } = this.props;
    const isTournament = gameType === GameTypeCodes.tournament;

    if (editable && !isTournament) {
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

    if (checkResult) {
      editor.onKeyDown(e => {
        if (e.code === 'Enter' && e.ctrlKey === true) {
          checkResult();
        }
      });
    }
    // this.editor.getModel().updateOptions({ tabSize: this.tabSize });

    this.editor.addCommand(
      this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Enter,
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
  const gameType = gameTypeSelector(state);
  return {
    gameType,
  };
};

export default connect(mapStateToProps)(Editor);
