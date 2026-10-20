import { ActionIcon, Combobox, Text, useCombobox } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { isLocale, type Locale, LOCALE_LABELS, SUPPORTED_LOCALES } from '@/i18n';

interface LocaleSelectProps {
  value: Locale;
  onChange: (locale: Locale) => void;
  locales?: readonly Locale[];
  disabled?: boolean;
  label?: string;
}

/** The same compact language menu for the interface and task descriptions. */
export function LocaleSelect({ value, onChange, locales = SUPPORTED_LOCALES, disabled, label }: LocaleSelectProps) {
  const { t } = useTranslation();
  const combobox = useCombobox({
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  return (
    <Combobox
      store={combobox}
      width={150}
      position="bottom-end"
      onOptionSubmit={(locale) => {
        combobox.closeDropdown();
        if (isLocale(locale) && locales.includes(locale)) onChange(locale);
      }}
    >
      <Combobox.Target>
        <ActionIcon
          size="md"
          variant="default"
          aria-label={label ?? t('Language')}
          title={LOCALE_LABELS[value]}
          disabled={disabled}
          onClick={() => combobox.toggleDropdown()}
        >
          <Text span size="xs" fw={600}>{value.toUpperCase()}</Text>
        </ActionIcon>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {locales.map((locale) => (
            <Combobox.Option key={locale} value={locale} active={locale === value}>
              <span lang={locale}>{LOCALE_LABELS[locale]}</span>
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
