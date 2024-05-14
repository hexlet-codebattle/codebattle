export const makeGameUrl = (...paths) => `/games/${paths.join('/')}/`;
export const getSignInGithubUrl = () => '/auth/github';
export const getCreateTrainingGameUrl = () => '/games/training';
export const getLobbyUrl = params => (params ? `/?${params}` : '/#lobby');
export const getUserProfileUrl = userId => `/users/${userId}`;
export const getTournamentUrl = (tournamentId, params) => (
  `/tournaments/${tournamentId}?${Object.keys(params).map(key => `${key}=${params[key]}`).join('&')}`
);
export const getTournamentSpectatorUrl = (tournamentId, playerId) => (
  `/tournaments/${tournamentId}/player/${playerId}`
);
export const getCustomEventPlayerDefaultImgUrl = user => `https://ui-avatars.com/api/?name=${user.name}&background=ffdb4d&color=ff0000`;

export const tournamentEmptyPlayerUrl = '/assets/images/question-mark-50.png';
