import { createMachine } from 'xstate';

import editor, { config as editorConfig } from './editor';
import game, { config as gameConfig } from './game';
import spectator, { config as spectatorConfig } from './spectator';
import task, { config as taskConfig } from './task';

// xstate v5's `createMachine` expects a strongly-typed config; our machine
// definitions are plain config objects with widened string literals, so we cast
// through `any` here rather than fighting the library's inference. Guards/actions
// are attached via `.provide(...)` (v5 replacement for the old second argument).
export default {
  game: createMachine(game as any).provide(gameConfig as any),
  editor: createMachine(editor as any).provide(editorConfig as any),
  task: createMachine(task as any).provide(taskConfig as any),
  spectator: createMachine(spectator as any).provide(spectatorConfig as any),
};
