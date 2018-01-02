import React, { Component } from 'react';
import PropTypes from 'prop-types';
import AceEditor from 'react-ace';
import 'brace';
import 'brace/mode/javascript';
import 'brace/mode/ruby';
import 'brace/mode/elixir';
import 'brace/theme/solarized_dark';
import languages from '../config/languages';

class Editor extends Component {
  static propTypes = {
    value: PropTypes.string,
    name: PropTypes.string.isRequired,
    editable: PropTypes.bool,
    lang: PropTypes.string.isRequired,
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
      lang,
      onChange,
    } = this.props;
    const syntax = languages[lang];

    return (
      <AceEditor
        mode={syntax}
        theme="solarized_dark"
        onChange={onChange}
        name={name}
        value={value}
        readOnly={!editable}
        editorProps={{ $blockScrolling: true }}
        width="auto"
        fontSize={16}
        showPrintMargin={false}
      />
    );
  }
}

export default Editor;
