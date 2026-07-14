interface MatchLike {
  playerIds: number[];
}

export const getOpponentId = (match: MatchLike, playerId: number) =>
  match.playerIds[0] === playerId ? match.playerIds[1] : match.playerIds[0];

export default getOpponentId;
