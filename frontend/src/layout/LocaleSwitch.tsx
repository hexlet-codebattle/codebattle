import { router } from '@inertiajs/react';
import { ActionIcon, Combobox, Text, useCombobox } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateLocale } from '@/features/settings/api';
import { type Locale, SUPPORTED_LOCALES } from '@/i18n';
import { useSharedProps } from '@/shared/useSharedProps';

export function LocaleSwitch() {
  const { t, i18n } = useTranslation();
  const { locale_forced: forced } = useSharedProps();
  const [saving, setSaving] = useState(false);
  const combobox = useCombobox({
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

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
    <Combobox
      store={combobox}
      width={120}
      position="bottom-end"
      onOptionSubmit={(locale) => {
        combobox.closeDropdown();
        if (locale === 'en' || locale === 'ru') void changeLocale(locale);
      }}
    >
      <Combobox.Target>
        <ActionIcon
          size="md"
          variant="default"
          aria-label={t('Language')}
          disabled={saving}
          onClick={() => combobox.toggleDropdown()}
        >
          <Text span size="xs" fw={600}>{i18n.language.toUpperCase()}</Text>
        </ActionIcon>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {SUPPORTED_LOCALES.map((locale) => (
            <Combobox.Option key={locale} value={locale} active={locale === i18n.language}>
              <span lang={locale}>{locale === 'ru' ? 'Русский' : 'English'}</span>
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
