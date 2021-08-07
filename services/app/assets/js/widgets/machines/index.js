import { Machine } from 'xstate';

import game, { config as gameConfig } from './game';
import editor, { config as editorConfig } from './editor';

export default {
  game: Machine(game, gameConfig),
  editor: Machine(editor, editorConfig),
};
