import qs from 'qs';
import md5 from 'md5';

export const makeCreateGameUrlDefault = (gameLevel, gameType, timeoutSeconds) => {
  const queryParamsString = qs.stringify({
    level: gameLevel,
    type: gameType,
    timeout_seconds: timeoutSeconds,
  });
  return `/games?${queryParamsString}`;
};

export const makeCreateGameBotUrl = (...paths) => `/games/${paths.join('/')}/`;
export const getSignInGithubUrl = () => '/auth/github';
export const getGravatarURL = email => {
  const address = String(email).trim().toLowerCase();
  const hash = md5(address);
  const defaultAvatarURL = encodeURIComponent('https://avatars0.githubusercontent.com/u/35539033');

  return `https://www.gravatar.com/avatar/${hash}?default=${defaultAvatarURL}`;
};
