import { ActionIcon, Group, Popover, Text } from '@mantine/core';
import { IconAdjustments } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ColorSchemeToggle } from './ColorSchemeToggle';
import { LocaleSwitch } from './LocaleSwitch';
import { SoundToggle } from './SoundToggle';

/** Keep secondary controls available without squeezing the navigation on phones. */
export function HeaderTools({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const controls = (
    <>
      {children}
      <SoundToggle />
      <ColorSchemeToggle />
      <LocaleSwitch />
    </>
  );

  return (
    <>
      <Group gap={6} wrap="nowrap" visibleFrom="md">
        {controls}
      </Group>
      <Popover position="bottom-end" width={280} withArrow>
        <Popover.Target>
          <ActionIcon hiddenFrom="md" size="lg" variant="default" aria-label={t('Settings')}>
            <IconAdjustments size={18} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <Text size="sm" fw={700} mb="sm">
            {t('Settings')}
          </Text>
          <Group gap="sm">
            {controls}
          </Group>
        </Popover.Dropdown>
      </Popover>
    </>
  );
}
