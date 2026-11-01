import { t } from '@/i18n';

/** Registration and Ecto settings validation use different messages for the same error. */
export function nicknameError(message: string | undefined) {
  if (message && ['Nickname is already taken', 'Nickname has already been taken', 'has already been taken', 'Has already been taken'].includes(message)) {
    return t('Nickname is already taken');
  }
  return message;
}
