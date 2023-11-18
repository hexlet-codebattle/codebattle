export const getOpponentId = (match, playerId) => (match.playerIds[0] === playerId ? match.playerIds[1] : match.playerIds[0]);

export default getOpponentId;
