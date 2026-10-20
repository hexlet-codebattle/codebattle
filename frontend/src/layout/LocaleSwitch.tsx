import { router } from '@inertiajs/react';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateLocale } from '@/features/settings/api';
import { type Locale, normalizeLocale } from '@/i18n';
import { LocaleSelect } from '@/shared/LocaleSelect';
import { useSharedProps } from '@/shared/useSharedProps';

export function LocaleSwitch() {
  const { t, i18n } = useTranslation();
  const { locale_forced: forced } = useSharedProps();
  const [saving, setSaving] = useState(false);

  if (forced) return null;

  const changeLocale = async (locale: Locale) => {
    if (saving || locale === i18n.language) return;
    setSaving(true);
    try {
      const saved = await updateLocale(locale);
      await i18n.changeLanguage(saved.locale);
      document.documentElement.setAttribute('lang', saved.locale);
      router.reload({ only: ['locale', 'current_user'], onFinish: () => setSaving(false) });
    } catch {
      setSaving(false);
      notifications.show({ color: 'red', message: t("Couldn't save your settings. Try again.") });
    }
  };

  return (
    <LocaleSelect value={normalizeLocale(i18n.language)} onChange={changeLocale} disabled={saving} />
  );
}
