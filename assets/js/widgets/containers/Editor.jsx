import React, { Component } from 'react';
import PropTypes from 'prop-types';
import AceEditor from 'react-ace';

import 'brace';
import 'brace/mode/javascript';
import 'brace/theme/solarized_dark';

class Editor extends Component {
  static propTypes = {
    value: PropTypes.string,
    name: PropTypes.string.isRequired,
    editable: PropTypes.bool,
    onChange: PropTypes.func,
  }

  static defaultProps = {
    value: '',
    editable: false,
    onChange: null,
  }

  render() {
    const {
      value,
      name,
      editable,
      onChange,
    } = this.props;

    return (
      <AceEditor
        mode="javascript"
        theme="solarized_dark"
        onChange={onChange}
        name={name}
        value={value}
        readOnly={!editable}
        editorProps={{ $blockScrolling: true }}
        width="auto"
        fontSize={16}
      />
    );
  }
}

export default Editor;
