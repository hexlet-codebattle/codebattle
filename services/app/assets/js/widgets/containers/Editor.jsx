import React, { PureComponent } from 'react';
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
    mode: PropTypes.string,
  }

  static defaultProps = {
    value: '',
    editable: false,
    onChange: null,
    syntax: 'javascript',
    mode: 'default',
  }

  constructor(props) {
    super(props);
    this.statusBarRef = React.createRef();
  }

  componentDidMount() {
    const { mode } = this.props;
    const convertRemToPixels = rem => rem * parseFloat(getComputedStyle(document.documentElement)
      .fontSize);
    // statusBarHeight = lineHeight = current fontSize * 1.5
    this.statusBarHeight = convertRemToPixels(1) * 1.5;
    this.modes = {
      default: () => null,
      vim: () => initVimMode(this.editor, this.statusBarRef.current),
    };

    this.currentMode = this.modes[mode]();
  }

  componentDidUpdate = async (prevProps) => {
    const { syntax, mode } = this.props;
    const notIncludedSyntaxHightlight = new Set(['haskell', 'elixir']);
    if (notIncludedSyntaxHightlight.has(syntax)) {
      const { default: HighlightRules } = await import(`monaco-ace-tokenizer/lib/ace/definitions/${syntax}`);
      this.monaco.languages.register({
        id: syntax,
      });
      registerRulesForLanguage(syntax, new HighlightRules());
    }
    if (mode !== prevProps.mode) {
      if (this.currentMode) {
        this.currentMode.dispose();
      }
      this.statusBarRef.current.innerHTML = '';
      this.currentMode = this.modes[mode]();
    }
  }


  handleResize = () => this.editor.layout();

  handleChange = (content) => {
    const { onCodeChange } = this.props;
    onCodeChange({ content });
  }

  editorDidMount = (editor, monaco) => {
    this.editor = editor;
    this.monaco = monaco;
    const { editable } = this.props;
    if (editable) {
      this.editor.focus();
    } else {
      // disable copying for spectator
      // eslint-disable-next-line no-bitwise
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_C, () => null);
      this.editor.onDidChangeCursorSelection(
        () => {
          const { column, lineNumber } = this.editor.getPosition();
          this.editor.setPosition({ lineNumber, column });
        },
      );
    }
    // this.editor.getModel().updateOptions({ tabSize: this.tabSize });

    // eslint-disable-next-line no-bitwise
    this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Enter, () => null);

    window.addEventListener('resize', this.handleResize);
  }

  render() {
    const {
      value,
      name,
      editable,
      syntax,
      onChange,
      editorHeight,
      mode,
    } = this.props;
    // FIXME: move here and apply mapping object
    const mappedSyntax = syntax === 'js' ? 'javascript' : syntax;
    const options = {
      lineNumbersMinChars: 3,
      readOnly: !editable,
      contextmenu: editable,
      fontSize: 16,
      scrollBeyondLastLine: false,
      selectOnLineNumbers: true,
      // automaticLayout: true,
      minimap: {
        enabled: false,
      },
    };
    const editorHeightWithStatusBar = mode === 'vim' ? editorHeight - this.statusBarHeight : editorHeight;
    return (
      <>
        <MonacoEditor
          theme="vs-dark"
          options={options}
          width="auto"
          height={editorHeightWithStatusBar}
          language={mappedSyntax}
          editorDidMount={this.editorDidMount}
          name={name}
          value={value}
          onChange={onChange}
        />
        <div ref={this.statusBarRef} className="bg-dark text-white px-1" />
      </>
    );
  }
}

export default Editor;
