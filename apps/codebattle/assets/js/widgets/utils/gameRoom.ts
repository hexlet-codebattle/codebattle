import sortBy from 'lodash/sortBy';

import userTypes from '../config/userTypes';

interface GameStatusParams {
  id?: number | string;
  state?: string;
  startsAt?: string;
  type?: string;
  mode?: string;
  timeoutSeconds?: number;
  durationSec?: number;
  finishesAt?: string;
  hideBannedPlayerControls?: boolean;
  rematchState?: string;
  tournamentId?: number | string;
  rematchInitiatorId?: number | string;
  headToHead?: boolean;
}

interface GamePlayer {
  id?: number | string;
  editorText?: string;
  editorLang?: string;
  checkResult?: Record<string, unknown>;
  [key: string]: unknown;
}

export const getGameStatus = ({
  id,
  state,
  startsAt,
  type,
  mode,
  timeoutSeconds,
  durationSec,
  finishesAt,
  hideBannedPlayerControls,
  rematchState,
  tournamentId,
  rematchInitiatorId,
  headToHead,
}: GameStatusParams) => ({
  gameId: id,
  state,
  type,
  mode,
  startsAt,
  headToHead,
  timeoutSeconds,
  durationSec,
  finishesAt,
  hideBannedPlayerControls,
  rematchState,
  rematchInitiatorId,
  tournamentId,
});

export const getGamePlayers = (players: GamePlayer[]) => {
  const [firstPlayer, secondPlayer] = sortBy(players, (player) => player?.id);
  const typedPlayers = [{ ...firstPlayer, type: userTypes.firstPlayer }];

  if (secondPlayer) {
    typedPlayers.push({ ...secondPlayer, type: userTypes.secondPlayer });
  }

  return typedPlayers;
};

export const getPlayersText = (player: GamePlayer) => ({
  userId: player.id,
  editorText: player.editorText,
  langSlug: player.editorLang,
});

export const getPlayersExecutionData = (player: GamePlayer) => ({
  ...player.checkResult,
  userId: player.id,
});

export const makeEditorTextKey = (userId: number | string, lang: string) => `${userId}:${lang}`;

export const setPlayerToSliceState = (
  state: Record<string, unknown>,
  player: GamePlayer & { id: number | string },
) => ({
  ...state,
  [player.id]: { ...(state[player.id] as object), ...player },
});
