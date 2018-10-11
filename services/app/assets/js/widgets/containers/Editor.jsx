import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Gon from 'gon';
import AceEditor from 'react-ace';
import 'brace';
import 'brace/mode/javascript';
import 'brace/mode/ruby';
import 'brace/mode/elixir';
import 'brace/mode/php';
import 'brace/mode/python';
import 'brace/theme/solarized_dark';

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
  }

  static defaultProps = {
    value: '',
    editable: false,
    onChange: null,
    syntax: 'javascript',
    allowCopy: true,
  }

  render() {
    const {
      value,
      name,
      editable,
      syntax,
      onChange,
      allowCopy,
    } = this.props;

    return (
      <div style={{ position: 'relative' }}>
        <AceEditor
          mode={syntax}
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
