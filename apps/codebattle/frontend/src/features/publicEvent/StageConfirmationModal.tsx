import { Button, Group, Modal, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

interface StageConfirmationModalProps {
  eventSlug: string;
  stage: { slug: string; actionText: string | null; confirmationText: string | null } | null;
  onClose: () => void;
}

/** "Start this stage?" — confirming posts to PublicEventController.stage, which redirects into the tournament. */
export function StageConfirmationModal({ eventSlug, stage, onClose }: StageConfirmationModalProps) {
  const { t } = useTranslation();
  const action = stage
    ? `/e/${encodeURIComponent(eventSlug)}/stage?stage_slug=${encodeURIComponent(stage.slug)}`
    : '';

  return (
    <Modal opened={!!stage} onClose={onClose} title={t('Stage confirmation')} centered>
      {stage && (
        <form method="post" action={action}>
          <input type="hidden" name="_csrf_token" value={csrfToken()} />
          {stage.confirmationText && (
            <Text size="sm" mb="md" style={{ whiteSpace: 'pre-line' }}>
              {stage.confirmationText}
            </Text>
          )}
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" variant="default">
              {t(stage.actionText || 'Start')}
            </Button>
          </Group>
        </form>
      )}
    </Modal>
  );
}
