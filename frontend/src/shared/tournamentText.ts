import templates from '../../../priv/tournament_templates.json';
import { getLocale, type Locale } from '@/i18n';

export type TournamentText = Partial<Record<Locale, string | null>>;

export interface TournamentTranslations {
  name_translations?: TournamentText;
  description_translations?: TournamentText;
}

export function localizedTournamentText(translations: TournamentText | undefined, original: string | null, locale = getLocale()) {
  return translations?.[locale]?.trim() || translations?.en?.trim() || original || '';
}

export function seasonTemplate(name: string, grade: string) {
  return Object.entries(templates).find(([key, template]) => key === grade && template.name.en === name)?.[1];
}

export function tournamentDescription(tournament: TournamentTranslations & { description: string | null; grade?: string }) {
  const template = Object.entries(templates).find(([grade, value]) =>
    grade === tournament.grade && value.legacy_description === tournament.description,
  )?.[1];
  return localizedTournamentText(tournament.description_translations ?? template?.description, tournament.description);
}
