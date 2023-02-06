export const makeGameUrl = (...paths) => `/games/${paths.join('/')}/`;
export const getSignInGithubUrl = () => '/auth/github';
export const getCreateTrainingGameUrl = () => '/games/training';
export const getLobbyUrl = params => (params ? `/?${params}` : '/#lobby');
