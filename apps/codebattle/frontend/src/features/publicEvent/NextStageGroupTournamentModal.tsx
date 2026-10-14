import { Button, Group, Modal, Text } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NextStageGroupTournamentModalProps {
  groupTournamentId: number | null;
  /** The RU text names the platform (%{external_platform_name}). */
  externalPlatformName?: string | null;
}

/**
 * Opens by itself when the user's next active stage is an AI-round group
 * tournament, pointing them there (legacy NextStageGroupTournamentModal).
 */
export function NextStageGroupTournamentModal({
  groupTournamentId,
  externalPlatformName,
}: NextStageGroupTournamentModalProps) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(!!groupTournamentId);

  useEffect(() => setOpened(!!groupTournamentId), [groupTournamentId]);

  if (!groupTournamentId) return null;

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={t('First qualification round finished')}
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Text size="sm" mb="md">
        {t('Your next step is the AI-round group tournament. Click the button below to continue.', {
          external_platform_name: externalPlatformName ?? '',
        })}
      </Text>
      <Group justify="flex-end">
        <Button
          component="a"
          href={`/group_tournaments/${groupTournamentId}`}
          variant="default"
          rightSection={<IconArrowRight size={14} />}
        >
          {t('Go to AI-round group tournament')}
        </Button>
      </Group>
    </Modal>
  );
}
