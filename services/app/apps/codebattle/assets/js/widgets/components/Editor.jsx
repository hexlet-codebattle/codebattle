import React, { memo } from 'react';

import '../initEditor';
import MonacoEditor from '@monaco-editor/react';
import PropTypes from 'prop-types';

import languages from '../config/languages';
import useEditor from '../utils/useEditor';

import EditorLoading from './EditorLoading';

function Editor(props) {
  const {
    value,
    syntax,
    onChange,
    theme,
    loading = false,
  } = props;
  const mappedSyntax = languages[syntax];

  const {
    options,
    handleEditorDidMount,
    handleEditorWillMount,
  } = useEditor(props);

  return (
    <>
      <MonacoEditor
        theme={theme}
        options={options}
        width="100%"
        height="100%"
        language={mappedSyntax}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        value={value}
        onChange={onChange}
        data-guide-id="Editor"
      />
      <EditorLoading loading={loading} />
    </>
  );
}

Editor.propTypes = {
  value: PropTypes.string.isRequired,
  syntax: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  wordWrap: PropTypes.string,
  lineNumbers: PropTypes.string,
  fontSize: PropTypes.number,
  editable: PropTypes.bool,
  roomMode: PropTypes.string.isRequired,
  checkResult: PropTypes.func.isRequired,
  userType: PropTypes.string.isRequired,
  userId: PropTypes.number.isRequired,
};

Editor.defaultProps = {
  wordWrap: 'off',
  lineNumbers: 'on',
  syntax: 'js',
  fontSize: 16,
  editable: false,
  loading: false,
};

export default memo(Editor);
