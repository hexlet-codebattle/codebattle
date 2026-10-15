import { ActionIcon, Tooltip, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function ColorSchemeToggle() {
  const { t } = useTranslation();
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('dark');
  const next = scheme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? t('Switch to dark theme') : t('Switch to light theme');

  return (
    <Tooltip label={label}>
      <ActionIcon size="md" variant="default" aria-label={label} onClick={() => setColorScheme(next)}>
        {scheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
      </ActionIcon>
    </Tooltip>
  );
}
