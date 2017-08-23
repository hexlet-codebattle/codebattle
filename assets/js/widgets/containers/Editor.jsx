import React, { Component } from 'react';
import AceEditor from 'react-ace';

import 'brace';
import 'brace/mode/javascript';
import 'brace/theme/solarized_dark';


class Editor extends Component {
  onChange = (...newValue) => {
    console.log('change 1', newValue);
  }

  render() {
    return (
      <AceEditor
        mode="javascript"
        theme="solarized_dark"
        onChange={this.onChange}
        name="UNIQUE_ID_OF_DIV"
        editorProps={{ $blockScrolling: true }}
      />
    );
  }
}

export default Editor;
