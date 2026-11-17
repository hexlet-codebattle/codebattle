import { useState } from 'react';
import { Affix, Button } from '@mantine/core';
import { IconMessageReport } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { FeedbackModal } from '@/features/feedback/FeedbackModal';
import { useSharedProps } from '@/shared/useSharedProps';

export function FeedbackAffix({ translucent = false, zIndex = 100 }: { translucent?: boolean; zIndex?: number }) {
  const { t } = useTranslation();
  const { current_user: user } = useSharedProps();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (user.is_guest) return null;

  return (
    <>
      <FeedbackModal opened={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <Affix position={{ bottom: 20, right: 20 }} zIndex={zIndex}>
        <Button
          size="sm"
          radius="xl"
          variant="filled"
          color="slate"
          title={t('Feedback')}
          aria-label={t('Feedback')}
          onClick={() => setFeedbackOpen(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            opacity: translucent && !hovered ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
          px={hovered ? 'md' : 10}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: hovered ? 8 : 0, transition: 'gap 0.2s ease' }}>
            <IconMessageReport size={18} />
            <span
              style={{
                maxWidth: hovered ? 120 : 0,
                opacity: hovered ? 1 : 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {t('Feedback')}
            </span>
          </div>
        </Button>
      </Affix>
    </>
  );
}
