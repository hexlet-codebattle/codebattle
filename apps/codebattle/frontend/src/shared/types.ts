// Inertia shared props set by CodebattleWeb.Plugs.AssignInertiaProps on every page.
// Only the fields the new frontend reads are typed; add more as pages need them.

export interface CurrentUser {
  id: number;
  name: string;
  is_guest: boolean;
  is_admin?: boolean;
  avatar_url: string | null;
  clan: string | null;
  lang: string | null;
  locale: string | null;
  rating: number | null;
  rank: number | null;
  points: number | null;
}

export interface Season {
  id: number;
  name: string;
  year: number;
  starts_at: string;
  ends_at: string;
}

/** Header branding (CodebattleWeb.Plugs.AssignInertiaProps.present_branding/1). */
export interface Branding {
  logo_title: string | null;
  app_subtitle: string | null;
  /** "left" puts the title before the logo. */
  logo_title_position: 'left' | 'right' | string | null;
  collab_logo: string | null;
  collab_logo_minor: string | null;
  /** Pre-formatted, e.g. "1.2k". */
  github_stars: string;
  /** Hides the GitHub/online block, like the legacy header. */
  hide_invites: boolean;
  /** Keeps only "Sign out" in the user menu. */
  hide_user_dropdown: boolean;
}

export interface SharedProps {
  branding: Branding;
  current_user: CurrentUser;
  current_season: Season | null;
  locale: string;
  user_token: string;
  [key: string]: unknown;
}
