import { Machine } from 'xstate';

import editor, { config as editorConfig } from './editor';
import game, { config as gameConfig } from './game';
import spectator, { config as spectatorConfig } from './spectator';
import task, { config as taskConfig } from './task';
import waitingRoom, { config as waitingRoomConfig } from './waitingRoom';

export default {
  game: Machine(game, gameConfig),
  editor: Machine(editor, editorConfig),
  task: Machine(task, taskConfig),
  spectator: Machine(spectator, spectatorConfig),
  waitingRoom: Machine(waitingRoom, waitingRoomConfig),
};
