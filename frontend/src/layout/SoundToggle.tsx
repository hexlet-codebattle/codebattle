import { ActionIcon, Tooltip } from '@mantine/core';
import { IconVolume, IconVolumeOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useSoundMute } from '@/features/settings/useSoundMute';

export function SoundToggle() {
  const { t } = useTranslation();
  const { muted, toggle } = useSoundMute();
  const label = muted ? t('Turn sound on') : t('Mute sound');

  return (
    <Tooltip label={label}>
      <ActionIcon
        size="md"
        variant="default"
        aria-label={label}
        aria-pressed={muted}
        onClick={() => void toggle(!muted)}
      >
        {muted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
      </ActionIcon>
    </Tooltip>
  );
}
