export const makeGameUrl = (...paths) => `/games/${paths.join("/")}/`;
export const getSignInGithubUrl = () => "/auth/github";
export const getCreateTrainingGameUrl = () => "/games/training";
export const getLobbyUrl = (params) => (params ? `/?${params}` : "/#lobby");
export const getUserProfileUrl = (userId) => `/users/${userId}`;
export const getTournamentUrl = (tournamentId, params = {}) =>
  `/tournaments/${tournamentId}?${Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join("&")}`;
export const getTournamentSpectatorUrl = (tournamentId, playerId) =>
  `/tournaments/${tournamentId}/player/${playerId}`;

const colors = ["2AE881", "73CCFE", "B6A4FF", "FF621E", "FF9C41", "FFE500"];

const getBackgroundColor = (name) => {
  const index = name.length % colors.length;
  return colors[index];
};

const normalizeName = (name) => {
  const trimmedName = (name || "").trim();
  return trimmedName || "?";
};

const getInitials = (name) => {
  const nameParts = normalizeName(name).split(/\s+/).filter(Boolean);

  if (nameParts.length === 1) {
    return nameParts[0].slice(0, 2).toUpperCase();
  }

  return nameParts
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
};

const escapeXmlText = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export const getCustomEventPlayerDefaultImgUrl = (user) => {
  const normalizedName = normalizeName(user.name);
  const color = getBackgroundColor(normalizedName);
  const initials = escapeXmlText(getInitials(normalizedName));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><rect width='128' height='128' fill='#${color}' /><text x='50%' y='50%' dy='.1em' fill='#ffffff' font-family='Arial,sans-serif' font-size='48' font-weight='700' text-anchor='middle'>${initials}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
export const tournamentEmptyPlayerUrl = "/assets/images/question-mark-50.png";
