// assets/js/monaco-bootstrap.js

// 1) wire workers & include monaco css (per official ESM docs)
import '../monaco.setup';
import 'monaco-editor/min/vs/editor/editor.main.css';

// 2) use the @monaco-editor/react loader to get the monaco instance
import { loader } from '@monaco-editor/react';

// 3) no need to provide a CDN or custom monaco — Vite handles ESM bundling
//    If you ever want to tweak loader config, you can still call loader.config({ ... })

import haskellProvider from './config/editor/haskell';
import mongodbProvider, {
  languageConfig as mongodbLangConf,
} from './config/editor/mongodb';
import sassProvider from './config/editor/sass';
import stylusProvider from './config/editor/stylus';
import zigProvider from './config/editor/zig';

loader.init().then(monaco => {
  // Haskell
  monaco.languages.register({ id: 'haskell', aliases: ['haskell'] });
  monaco.languages.setMonarchTokensProvider('haskell', haskellProvider);

  // Stylus
  monaco.languages.register({ id: 'stylus', aliases: ['stylus'] });
  monaco.languages.setMonarchTokensProvider('stylus', stylusProvider);

  // SCSS
  monaco.languages.register({ id: 'scss', aliases: ['scss'] });
  monaco.languages.setMonarchTokensProvider('scss', sassProvider);

  // MongoDB
  monaco.languages.register({ id: 'mongodb', aliases: ['mongodb'] });
  monaco.languages.setMonarchTokensProvider('mongodb', mongodbProvider);
  monaco.languages.setLanguageConfiguration('mongodb', mongodbLangConf);

  // Zig
  monaco.languages.register({ id: 'zig', aliases: ['zig'] });
  monaco.languages.setMonarchTokensProvider('zig', zigProvider);
});
