export const getTournamentAccessToken = (search = window.location.search) => {
  const value = new URLSearchParams(search).get("access_token");

  return value ? value.trim() : "";
};

export const getTournamentJoinPayload = (
  search = window.location.search,
  fallbackAccessToken = "",
) => {
  const normalizedFallback =
    typeof fallbackAccessToken === "string" ? fallbackAccessToken.trim() : "";
  const accessToken = getTournamentAccessToken(search) || normalizedFallback;

  return accessToken ? { access_token: accessToken } : {};
};
