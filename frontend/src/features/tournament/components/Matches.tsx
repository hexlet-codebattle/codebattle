import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';


import type { Match, PlayerResult } from '../types';

const RESULT_COLORS: Record<string, string> = { won: 'green', lost: 'red', gave_up: 'orange', timeout: 'gray' };

export function ResultBadge({ result }: { result: PlayerResult | undefined }) {
  const { t } = useTranslation();
  if (!result || !result.result || result.result === 'undefined') return null;
  const labels: Record<string, string> = { won: t('Won'), lost: t('Lost'), gave_up: t('Gave up'), timeout: t('Timeout') };

  return (
    <Badge size="xs" variant="light" color={RESULT_COLORS[result.result] ?? 'gray'}>
      {labels[result.result] ?? result.result}
    </Badge>
  );
}

export function MatchStateBadge({ match }: { match: Match }) {
  const { t } = useTranslation();
  const [color, label] =
    match.state === 'playing'
      ? ['green', t('Playing')]
      : match.state === 'pending'
        ? ['blue', t('Pending')]
        : match.state === 'timeout'
          ? ['gray', t('Timeout')]
          : match.state === 'canceled'
            ? ['gray', t('Canceled')]
            : ['gray', t('Finished')];

  return (
    <Badge size="xs" variant={match.state === 'playing' ? 'filled' : 'light'} color={color}>
      {label}
    </Badge>
  );
}
