import React, { memo } from 'react';

import MonacoEditor, { loader } from '@monaco-editor/react';
import PropTypes from 'prop-types';

import haskellProvider from '../config/editor/haskell';
import sassProvider from '../config/editor/sass';
import stylusProvider from '../config/editor/stylus';
import languages from '../config/languages';
import useEditor from '../utils/useEditor';

import EditorLoading from './EditorLoading';

const monacoVersion = '0.52.0';

loader.config({
  paths: {
    vs: `https://cdn.jsdelivr.net/npm/monaco-editor@${monacoVersion}/min/vs`,
  },
});

loader.init().then(monaco => {
  monaco.languages.register({ id: 'haskell', aliases: ['haskell'] });
  monaco.languages.setMonarchTokensProvider('haskell', haskellProvider);

  monaco.languages.register({ id: 'stylus', aliases: ['stylus'] });
  monaco.languages.setMonarchTokensProvider('stylus', stylusProvider);

  monaco.languages.register({ id: 'scss', aliases: ['scss'] });
  monaco.languages.setMonarchTokensProvider('scss', sassProvider);
});

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
  gameMode: PropTypes.string.isRequired,
  checkResult: PropTypes.func.isRequired,
  toggleMuteSound: PropTypes.func.isRequired,
  mute: PropTypes.bool.isRequired,
  userType: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
  onChangeCursorSelection: PropTypes.func.isRequired,
  onChangeCursorPosition: PropTypes.func.isRequired,
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
