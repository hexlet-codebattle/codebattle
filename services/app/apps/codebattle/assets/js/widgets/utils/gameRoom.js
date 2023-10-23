import userTypes from '../config/userTypes';

export const getGameStatus = ({
  id,
  state,
  startsAt,
  type,
  mode,
  timeoutSeconds,
  rematchState,
  tournamentId,
  rematchInitiatorId,
  score,
}) => ({
  gameId: id,
  state,
  type,
  mode,
  startsAt,
  score,
  timeoutSeconds,
  rematchState,
  rematchInitiatorId,
  tournamentId,
});

export const getGamePlayers = ([firstPlayer, secondPlayer]) => {
  const players = [{ ...firstPlayer, type: userTypes.firstPlayer }];

  if (secondPlayer) {
    players.push({ ...secondPlayer, type: userTypes.secondPlayer });
  }

  return players;
};

export const getPlayersText = player => ({
  userId: player.id,
  editorText: player.editorText,
  langSlug: player.editorLang,
});

export const getPlayersExecutionData = player => ({
  ...player.checkResult,
  userId: player.id,
});

export const makeEditorTextKey = (userId, lang) => `${userId}:${lang}`;

export const setPlayerToSliceState = (state, player) => ({
  ...state,
  [player.id]: { ...state[player.id], ...player },
});
