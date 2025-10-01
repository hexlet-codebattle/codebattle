export const makeGameUrl = (...paths) => `/games/${paths.join('/')}/`;
export const getSignInGithubUrl = () => '/auth/github';
export const getCreateTrainingGameUrl = () => '/games/training';
export const getLobbyUrl = params => (params ? `/?${params}` : '/#lobby');
export const getUserProfileUrl = userId => `/users/${userId}`;
export const getTournamentUrl = (tournamentId, params = {}) => `/tournaments/${tournamentId}?${Object.keys(params)
  .map(key => `${key}=${params[key]}`)
  .join('&')}`;
export const getTournamentSpectatorUrl = (tournamentId, playerId) => `/tournaments/${tournamentId}/player/${playerId}`;

const colors = ['2AE881', '73CCFE', 'B6A4FF', 'FF621E', 'FF9C41', 'FFE500'];

const getBackgroundColor = name => {
  const index = name.length % colors.length;
  return colors[index];
};

export const getCustomEventPlayerDefaultImgUrl = user => {
  const color = getBackgroundColor(user.name);
  return `https://ui-avatars.com/api/?name=${user.name}&background=${color}&color=ffffff`;
};
export const tournamentEmptyPlayerUrl = '/assets/images/question-mark-50.png';
