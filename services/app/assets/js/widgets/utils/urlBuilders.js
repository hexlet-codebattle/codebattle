export const makeGameUrl = (...paths) => `/games/${paths.join('/')}/`;
export const getSignInGithubUrl = () => '/auth/github';
export const getCreateTrainingGameUrl = () => '/games/training';
