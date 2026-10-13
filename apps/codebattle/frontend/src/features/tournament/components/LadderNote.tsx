import { Anchor } from '@mantine/core';
import { IconDeviceLaptop, IconFlag, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import type { Match, Tournament } from '../types';

import classes from './RoundClock.module.css';

/**
 * Ladder participant's line under the round clock (legacy LadderGameStatus): rounds
 * open on a fixed schedule and only pair free players, so say how their game relates.
 */
export function LadderNote({ tournament, liveMatch }: { tournament: Tournament; liveMatch: Match | null }) {
  const { t } = useTranslation();
  const nextRound = tournament.current_round_position + 2;
  const total = tournament.rounds_limit;
  const finalRound = total > 0 && nextRound > total;

  if (liveMatch) {
    return (
      <span className={classes.note}>
        <IconDeviceLaptop size={14} />
        <span>
          {finalRound
            ? t('Final round — no new pairs after this game')
            : nextRound === total
              ? t('Round %{round} is the last one — finish before the countdown ends to play it', { round: nextRound })
              : t('Finish before the countdown ends to play round %{round}', { round: nextRound })}{' '}
          <Anchor href={`/games/${liveMatch.game_id}`} size="xs" fw={700}>
            {t('Open game')}
          </Anchor>
        </span>
      </span>
    );
  }

  return (
    <span className={classes.note}>
      {finalRound ? <IconFlag size={14} /> : <IconUsers size={14} />}
      <span>
        {finalRound
          ? t('That was your last game in this tournament')
          : t("You'll get a new opponent when round %{round} starts", { round: nextRound })}
      </span>
    </span>
  );
}
