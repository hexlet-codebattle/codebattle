import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import AceEditor from 'react-ace';
import 'brace';
import 'brace/mode/javascript';
import 'brace/mode/ruby';
import 'brace/mode/elixir';
import 'brace/mode/php';
import 'brace/mode/haskell';
import 'brace/mode/clojure';
import 'brace/mode/perl';
import 'brace/mode/python';
import 'brace/theme/solarized_dark';
import 'brace/ext/language_tools';
import 'brace/keybinding/emacs';
import 'brace/keybinding/vim';

const selectionBlockStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

class Editor extends PureComponent {
  static propTypes = {
    value: PropTypes.string,
    name: PropTypes.string.isRequired,
    editable: PropTypes.bool,
    syntax: PropTypes.string,
    onChange: PropTypes.func,
    allowCopy: PropTypes.bool,
    keyboardHandler: PropTypes.string,
  }

  static defaultProps = {
    value: '',
    editable: false,
    onChange: null,
    syntax: 'javascript',
    allowCopy: true,
    keyboardHandler: '',
  }

  render() {
    const {
      value,
      name,
      editable,
      syntax,
      onChange,
      allowCopy,
      keyboardHandler,
    } = this.props;

    // FIXME: rename language name
    const mappedSyntax = syntax === 'js' ? 'javascript' : syntax;

    return (
      <div style={{ position: 'relative' }}>
        <AceEditor
          mode={mappedSyntax}
          theme="solarized_dark"
          onChange={onChange}
          name={name}
          value={value}
          readOnly={!editable}
          wrapLines
          editorProps={{ $blockScrolling: true }}
          width="auto"
          height="450px"
          fontSize={16}
          showPrintMargin={false}
          keyboardHandler={keyboardHandler}
          setOptions={{ tabSize: 2 }}
        />
        {
        allowCopy ? null : (
          <div style={selectionBlockStyle} />
        )}
      </div>
    );
  }
}

export default Editor;
