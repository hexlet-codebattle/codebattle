import { Machine } from 'xstate';

import editor, { config as editorConfig } from './editor';
import game, { config as gameConfig } from './game';
import task, { config as taskConfig } from './task';

export default {
  game: Machine(game, gameConfig),
  editor: Machine(editor, editorConfig),
  task: Machine(task, taskConfig),
};
