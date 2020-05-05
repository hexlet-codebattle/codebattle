import qs from 'qs';

export const makeCreateGameUrlDefault = (gameLevel, gameType, timeoutSeconds) => {
  const queryParamsString = qs.stringify({
    level: gameLevel,
    type: gameType,
    timeout_seconds: timeoutSeconds,
  });
  return `/games?${queryParamsString}`;
};

export const makeCreateGameBotUrl = (...paths) => `/games/${paths.join('/')}/`;
export const getSignGithubUrl = () => 'auth/github';
