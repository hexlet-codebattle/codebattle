import { useState } from 'react';
import { Affix, Button } from '@mantine/core';
import { IconMessageReport } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { FeedbackModal } from '@/features/feedback/FeedbackModal';
import { useSharedProps } from '@/shared/useSharedProps';

export function FeedbackAffix({ translucent = false }: { translucent?: boolean }) {
  const { t } = useTranslation();
  const { current_user: user } = useSharedProps();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (user.is_guest) return null;

  return (
    <>
      <FeedbackModal opened={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <Affix position={{ bottom: 20, right: 20 }}>
        <Button
          size="sm"
          radius="xl"
          variant="filled"
          color="slate"
          leftSection={<IconMessageReport size={18} />}
          onClick={() => setFeedbackOpen(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            opacity: translucent && !hovered ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {t('Feedback')}
        </Button>
      </Affix>
    </>
  );
}
