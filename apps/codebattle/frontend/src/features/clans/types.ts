// CodebattleWeb.NewFrontend.Present.clan/1 and clan_member/1.

export interface Clan {
  id: number;
  name: string | null;
  long_name: string | null;
  users_count: number | null;
  inserted_at: string;
  creator: { id: number; name: string } | null;
}

export interface ClanMember {
  id: number;
  name: string;
  avatar_url: string | null;
  lang: string | null;
  rating: number | null;
  rank: number | null;
  points: number | null;
  inserted_at: string;
}

/** Server NaiveDateTimes come without a zone; they are UTC. */
export { toIso as utc } from '@/shared/date';
