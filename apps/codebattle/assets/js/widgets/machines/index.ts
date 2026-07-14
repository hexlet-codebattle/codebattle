import { Machine } from 'xstate';

import editor, { config as editorConfig } from './editor';
import game, { config as gameConfig } from './game';
import spectator, { config as spectatorConfig } from './spectator';
import task, { config as taskConfig } from './task';

// xstate v4's `Machine` expects a strongly-typed `MachineConfig`; our machine
// definitions are plain config objects with widened string literals, so we cast
// through `any` here rather than fighting the library's inference.
export default {
  game: Machine(game as any, gameConfig as any),
  editor: Machine(editor as any, editorConfig as any),
  task: Machine(task as any, taskConfig as any),
  spectator: Machine(spectator as any, spectatorConfig as any),
};
