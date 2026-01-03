// assets/js/monaco-bootstrap.js

// 1) wire workers & include monaco css
import '../monaco.setup';
import 'monaco-editor/min/vs/editor/editor.main.css';
// Override codicon font path - MUST be after monaco CSS
import '../../css/monaco-codicon-fix.css';

// 2) Import monaco-editor directly
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// 3) use the @monaco-editor/react loader to configure it with local monaco

import haskellProvider from './config/editor/haskell';
import mongodbProvider, {
  languageConfig as mongodbLangConf,
} from './config/editor/mongodb';
import sassProvider from './config/editor/sass';
import stylusProvider from './config/editor/stylus';
import zigProvider from './config/editor/zig';

// Configure loader to use the local monaco instance
loader.config({ monaco });

loader.init().then((monacoInstance) => {
  // Haskell
  monacoInstance.languages.register({ id: 'haskell', aliases: ['haskell'] });
  monacoInstance.languages.setMonarchTokensProvider('haskell', haskellProvider);

  // Stylus
  monacoInstance.languages.register({ id: 'stylus', aliases: ['stylus'] });
  monacoInstance.languages.setMonarchTokensProvider('stylus', stylusProvider);

  // SCSS
  monacoInstance.languages.register({ id: 'scss', aliases: ['scss'] });
  monacoInstance.languages.setMonarchTokensProvider('scss', sassProvider);

  // MongoDB
  monacoInstance.languages.register({ id: 'mongodb', aliases: ['mongodb'] });
  monacoInstance.languages.setMonarchTokensProvider('mongodb', mongodbProvider);
  monacoInstance.languages.setLanguageConfiguration('mongodb', mongodbLangConf);

  // Zig
  monacoInstance.languages.register({ id: 'zig', aliases: ['zig'] });
  monacoInstance.languages.setMonarchTokensProvider('zig', zigProvider);
});
