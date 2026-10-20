import { type Locale, normalizeLocale, SUPPORTED_LOCALES } from '@/i18n';

export type TaskDescriptions = Partial<Record<`description_${Locale}`, string | null>>;

export const descriptionField = (locale: Locale): `description_${Locale}` => `description_${locale}`;

export const availableDescriptionLocales = (task: TaskDescriptions): Locale[] =>
  SUPPORTED_LOCALES.filter((locale) => Boolean(task[descriptionField(locale)]?.trim()));

export function taskDescriptionLocale(task: TaskDescriptions, preferred: unknown): Locale {
  const locale = normalizeLocale(preferred);
  const available = availableDescriptionLocales(task);
  return available.includes(locale) ? locale : available.includes('en') ? 'en' : available[0] ?? 'en';
}

export const taskDescription = (task: TaskDescriptions, preferred: unknown): string =>
  task[descriptionField(taskDescriptionLocale(task, preferred))] ?? '';
