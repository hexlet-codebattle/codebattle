import qs from 'qs';

export default ({
  gameLevel, gameType, timeoutSeconds, gameId,
}) => {
  const getDefaultUrl = () => {
    const queryParamsString = qs.stringify({
      level: gameLevel,
      type: gameType,
      timeout_seconds: timeoutSeconds,
    });
    return `/games?${queryParamsString}`;
  };
  const mapTypes = {
    withBot: () => `/games/${gameId}/join`,
    withRandomPlayer: getDefaultUrl,
    withFriend: getDefaultUrl,
  };

  const getUrl = mapTypes[gameType];
  return getUrl();
};
