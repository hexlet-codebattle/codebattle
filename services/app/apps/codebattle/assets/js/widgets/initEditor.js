import { loader } from '@monaco-editor/react';
import * as monacoLib from 'monaco-editor';

import haskellProvider from './config/editor/haskell';
import sassProvider from './config/editor/sass';
import stylusProvider from './config/editor/stylus';

// const monacoVersion = '0.52.0';

loader.config({
  monaco: monacoLib,
  // paths: {
  //   vs: `https://cdn.jsdelivr.net/npm/monaco-editor@${monacoVersion}/min/vs`,
  // },
});

loader.init().then(monaco => {
  monaco.languages.register({ id: 'haskell', aliases: ['haskell'] });
  monaco.languages.setMonarchTokensProvider('haskell', haskellProvider);

  monaco.languages.register({ id: 'stylus', aliases: ['stylus'] });
  monaco.languages.setMonarchTokensProvider('stylus', stylusProvider);

  monaco.languages.register({ id: 'scss', aliases: ['scss'] });
  monaco.languages.setMonarchTokensProvider('scss', sassProvider);
});
