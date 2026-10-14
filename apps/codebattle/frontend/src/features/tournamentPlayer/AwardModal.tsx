import { Image, Modal } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useGameStore } from '@/features/game/store';

import classes from './TournamentPlayer.module.css';

/**
 * The game's award (a tournament prize: an image URL or an emoji), shown when a check
 * hands it out while the screen watches; one already there on load stays quiet.
 */
export function AwardModal() {
  const { t } = useTranslation();
  const loaded = useGameStore((state) => state.game != null);
  const award = useGameStore((state) => state.game?.award ?? null);
  const baseline = useRef<string | null | undefined>(undefined);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (baseline.current !== undefined && award && award !== baseline.current) setOpened(true);
    baseline.current = award;
  }, [loaded, award]);

  return (
    <Modal opened={opened && Boolean(award)} onClose={() => setOpened(false)} title={t('Award')} centered size="lg">
      {award?.startsWith('http') ? (
        <Image src={award} alt={t('Game award')} className={classes.award} radius="md" />
      ) : (
        <span className={classes.awardText}>{award}</span>
      )}
    </Modal>
  );
}
