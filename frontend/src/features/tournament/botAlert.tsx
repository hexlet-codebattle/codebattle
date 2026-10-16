import { Anchor, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { t } from '@/i18n';

export interface BotAlert {
  game_id: number;
  reports: { user_id: number; level: string; score: number; signals: string[] }[];
}

/** Moderators: players of a finished game the bot detection flagged, with the game's report. */
export function showBotAlert(alert: BotAlert, nameOf: (userId: number) => string) {
  const high = alert.reports.some((report) => report.level === 'high');
  notifications.show({
    color: high ? 'red' : 'orange',
    autoClose: false,
    title: high ? t('Likely bot in game #%{id}', { id: alert.game_id }) : t('Suspicious play in game #%{id}', { id: alert.game_id }),
    message: (
      <Stack gap={4}>
        {alert.reports.map((report) => (
          <Text key={report.user_id} size="xs">
            <b>{nameOf(report.user_id)}</b> · {t('Score: %{score}', { score: report.score })}
            {report.signals[0] ? ` · ${report.signals[0]}` : ''}
          </Text>
        ))}
        <Anchor href={`/games/${alert.game_id}/ml`} target="_blank" size="xs">
          {t('Open the report')}
        </Anchor>
      </Stack>
    ),
  });
}
