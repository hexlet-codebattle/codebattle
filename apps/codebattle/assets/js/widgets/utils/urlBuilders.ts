type PathSegment = string | number;
type QueryParam = string | number | boolean;
type QueryParams = Record<string, QueryParam>;
type PlayerWithName = { name?: string | null };

export const makeGameUrl = (...paths: PathSegment[]) => `/games/${paths.join('/')}/`;
export const getSignInGithubUrl = () => '/auth/github';
export const getCreateTrainingGameUrl = () => '/games/training';
export const getLobbyUrl = (params?: string) => (params ? `/?${params}` : '/#lobby');
export const getUserProfileUrl = (userId: PathSegment) => `/users/${userId}`;
export const getTournamentUrl = (tournamentId: PathSegment, params: QueryParams = {}) =>
  `/tournaments/${tournamentId}?${Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')}`;
export const getTournamentSpectatorUrl = (tournamentId: PathSegment, playerId: PathSegment) =>
  `/tournaments/${tournamentId}/player/${playerId}`;

const colors = ['2AE881', '73CCFE', 'B6A4FF', 'FF621E', 'FF9C41', 'FFE500'];

const getBackgroundColor = (name: string) => {
  const index = name.length % colors.length;
  return colors[index];
};

const normalizeName = (name?: string | null) => {
  const trimmedName = (name || '').trim();
  return trimmedName || '?';
};

const getInitials = (name: string) => {
  const nameParts = normalizeName(name).split(/\s+/).filter(Boolean);

  if (nameParts.length === 1) {
    return nameParts[0].slice(0, 2).toUpperCase();
  }

  return nameParts
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
};

const escapeXmlText = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export const getCustomEventPlayerDefaultImgUrl = (user: PlayerWithName) => {
  const normalizedName = normalizeName(user.name);
  const color = getBackgroundColor(normalizedName);
  const initials = escapeXmlText(getInitials(normalizedName));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><rect width='128' height='128' fill='#${color}' /><text x='50%' y='50%' dy='.1em' fill='#ffffff' font-family='Arial,sans-serif' font-size='48' font-weight='700' text-anchor='middle'>${initials}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
export const tournamentEmptyPlayerUrl = '/assets/images/question-mark-50.png';
