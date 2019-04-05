/* eslint-disable no-bitwise */
import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import MonacoEditor from 'react-monaco-editor';
import { registerRulesForLanguage } from 'monaco-ace-tokenizer';
import { initVimMode } from 'monaco-vim';


class Editor extends PureComponent {
  static propTypes = {
    value: PropTypes.string,
    name: PropTypes.string.isRequired,
    editable: PropTypes.bool,
    syntax: PropTypes.string,
    onChange: PropTypes.func,
    mode: PropTypes.string.isRequired,
  }

  static defaultProps = {
    value: '',
    editable: false,
    onChange: null,
    syntax: 'javascript',
  }

  notIncludedSyntaxHightlight = new Set(['haskell', 'elixir'])

  constructor(props) {
    super(props);
    this.statusBarRef = React.createRef();
    const convertRemToPixels = rem => rem * parseFloat(getComputedStyle(document.documentElement)
      .fontSize);
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
  }


  async componentDidMount() {
    const { mode, syntax } = this.props;
    this.modes = {
      default: () => null,
      vim: () => initVimMode(this.editor, this.statusBarRef.current),
    };
    await this.updateHightLightForNotIncludeSyntax(syntax);
    this.currentMode = this.modes[mode]();
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
        ...this.props,
        readOnly: !editable,
        contextMenu: editable,
      };
    }
    if (prevProps.syntax !== syntax) {
      await this.updateHightLightForNotIncludeSyntax(syntax);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  updateHightLightForNotIncludeSyntax = async (syntax) => {
    if (this.notIncludedSyntaxHightlight.has(syntax)) {
      const { default: HighlightRules } = await import(`monaco-ace-tokenizer/lib/ace/definitions/${syntax}`);
      this.notIncludedSyntaxHightlight.delete(syntax);
      this.monaco.languages.register({
        id: syntax,
      });
      registerRulesForLanguage(syntax, new HighlightRules());
    }
  }

  handleResize = () => this.editor.layout();

  editorDidMount = (editor, monaco) => {
    this.editor = editor;
    this.monaco = monaco;
    const { editable } = this.props;
    if (editable) {
      this.editor.focus();
    } else {
      // disable copying for spectator
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_C, () => null);
      this.editor.onDidChangeCursorSelection(() => {
        const { column, lineNumber } = this.editor.getPosition();
        this.editor.setPosition({ lineNumber, column });
      });
    }
    // this.editor.getModel().updateOptions({ tabSize: this.tabSize });

    this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Enter, () => null);

    window.addEventListener('resize', this.handleResize);
  }

  render() {
    const {
      value,
      name,
      syntax,
      onChange,
      editorHeight,
      mode,
    } = this.props;
    // FIXME: move here and apply mapping object
    const mappedSyntax = syntax === 'js' ? 'javascript' : syntax;
    const editorHeightWithStatusBar = mode === 'vim' ? editorHeight - this.statusBarHeight : editorHeight;
    return (
      <Fragment>
        <MonacoEditor
          theme="vs-dark"
          options={this.options}
          width="auto"
          height={editorHeightWithStatusBar}
          language={mappedSyntax}
          editorDidMount={this.editorDidMount}
          name={name}
          value={value}
          onChange={onChange}
        />
        <div ref={this.statusBarRef} className="bg-dark text-white px-1" />
      </Fragment>
    );
  }
}

export default Editor;
