export const makeGameUrl = (...paths) => `/games/${paths.join('/')}/`;
export const getSignInGithubUrl = () => '/auth/github';
export const getCreateTrainingGameUrl = () => '/games/training';
export const getLobbyUrl = params => (params ? `/?${params}` : '/#lobby');
export const getUserProfileUrl = userId => `/users/${userId}`;
export const getTournamentUrl = (tournamentId, params) => (
  `tournament/${tournamentId}?${Object.keys(params).map(key => `${key}=${params[key]}`).join('&')}`
);
