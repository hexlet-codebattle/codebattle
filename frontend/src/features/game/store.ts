import { create } from 'zustand';

import type { CheckResult, Game, GamePlayer, GameTournamentInfo, TournamentPlayer, WaitType } from './types';

// One game per page: the game channel writes here, the widgets read.

export interface EditorState {
  text: string;
  lang: string;
}

/** Another player's caret (`from === to`) or selection, as offsets into their text. */
export interface RemoteCursor {
  from: number;
  to: number;
}

interface GameStore {
  game: Game | null;
  players: Record<number, GamePlayer>;
  /** Live editor contents per player (mine is local-first, theirs come from `editor:data`). */
  editors: Record<number, EditorState>;
  /** The other players' carets and selections (`editor:cursor_*`). */
  cursors: Record<number, RemoteCursor>;
  /** Players whose solution is being checked right now. */
  checking: Record<number, boolean>;
  outputs: Record<number, CheckResult>;
  /** The last "X gave up!" / result message. */
  message: string | null;
  tournament: GameTournamentInfo | null;
  currentPlayer: TournamentPlayer | null;
  /** The viewer's game in this tournament right now, when it isn't this one. */
  activeGameId: number | null;
  waitType: WaitType;

  load: (game: Game) => void;
  patchGame: (patch: Partial<Game>) => void;
  setPlayers: (players: GamePlayer[]) => void;
  setEditor: (userId: number, editor: Partial<EditorState>) => void;
  setCursor: (userId: number, cursor: RemoteCursor) => void;
  setChecking: (userId: number, checking: boolean) => void;
  setOutput: (userId: number, output: CheckResult) => void;
  setMessage: (message: string | null) => void;
  setTournament: (tournament: GameTournamentInfo | null) => void;
  mergeTournament: (patch: Partial<GameTournamentInfo>) => void;
  /** The channel join failed (e.g. "Game not found"). */
  joinError: string | null;
  set: (patch: Partial<Pick<GameStore, 'currentPlayer' | 'activeGameId' | 'waitType' | 'joinError'>>) => void;
  /** Empty the store (a view switching to another game). */
  reset: () => void;
}

const byId = (players: GamePlayer[]) => Object.fromEntries(players.map((player) => [player.id, player]));

const INITIAL = {
  game: null,
  players: {},
  editors: {},
  cursors: {},
  checking: {},
  outputs: {},
  message: null,
  tournament: null,
  currentPlayer: null,
  activeGameId: null,
  waitType: null,
  joinError: null as string | null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...INITIAL,
  reset: () => set(INITIAL),
  // The channel can send a game without its task (an older server bug); keep the page's copy.
  load: (incoming) =>
    set((state) => {
      const game =
        state.game?.id === incoming.id
          ? {
              ...incoming,
              task: incoming.task ?? state.game.task,
              langs: incoming.langs?.length ? incoming.langs : state.game.langs,
              // With async_game_score_on_join the join reply has none; the score arrives later.
              head_to_head: incoming.head_to_head ?? state.game.head_to_head,
            }
          : incoming;
      return {
        game,
        players: byId(game.players),
        editors: Object.fromEntries(game.players.map((player) => [player.id, { text: player.editor_text, lang: player.editor_lang }])),
        outputs: Object.fromEntries(
          game.players.filter((player) => player.check_result).map((player) => [player.id, player.check_result as CheckResult]),
        ),
        cursors: state.game?.id === game.id ? state.cursors : {},
        checking: {},
      };
    }),
  patchGame: (patch) => set((state) => ({ game: state.game ? { ...state.game, ...patch } : state.game })),
  // Server player copies carry stale editor text; the editors map stays authoritative for it.
  setPlayers: (players) =>
    set((state) => ({
      players: { ...state.players, ...byId(players) },
      game: state.game ? { ...state.game, players } : state.game,
    })),
  setEditor: (userId, editor) =>
    set((state) => ({
      editors: { ...state.editors, [userId]: { ...(state.editors[userId] ?? { text: '', lang: 'js' }), ...editor } },
    })),
  setCursor: (userId, cursor) => set((state) => ({ cursors: { ...state.cursors, [userId]: cursor } })),
  setChecking: (userId, checking) => set((state) => ({ checking: { ...state.checking, [userId]: checking } })),
  setOutput: (userId, output) => set((state) => ({ outputs: { ...state.outputs, [userId]: output } })),
  setMessage: (message) => set({ message }),
  setTournament: (tournament) => set({ tournament }),
  mergeTournament: (patch) => set((state) => ({ tournament: state.tournament ? { ...state.tournament, ...patch } : state.tournament })),
  set: (patch) => set(patch),
}));

export const isGameOver = (state: string | undefined) => state === 'game_over' || state === 'timeout' || state === 'canceled';

/** Over before an opponent joined: canceled by its creator, or expired while waiting. */
export const isAbandoned = (game: { state: string; players: unknown[] }) =>
  game.players.length < 2 && (game.state === 'canceled' || game.state === 'timeout');
