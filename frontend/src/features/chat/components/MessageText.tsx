import { Anchor, Text } from '@mantine/core';
import { IconSwords, IconTrophy } from '@tabler/icons-react';
import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { LEVEL_COLORS, levelLabel, tournamentTitle } from '@/features/lobby/format';
import { useLobbyStore } from '@/features/lobby/store';
import type { LobbyGame } from '@/features/lobby/types';
import { useSharedProps } from '@/shared/useSharedProps';

import { linkify } from '../linkify';
import { singleEmoji, splitInline } from '../mentions';

import classes from './Chat.module.css';
import { Emoji } from './Emoji';

function gameAction(game: LobbyGame | undefined) {
  if (!game) return { label: 'Open game', color: 'gray' };
  if (game.state === 'waiting_opponent') return { label: 'Join', color: 'green' };
  if (game.state === 'playing') return { label: 'Watch', color: 'blue' };

  return { label: 'Open game', color: 'gray' };
}

/** A link to one of the site's games, as a compact invite; live details come from the lobby list when known. */
function GameInvite({ id, href }: { id: number; href: string }) {
  const { t } = useTranslation();
  const game = useLobbyStore((state) => state.games.find((item) => item.id === id));
  const creator = game?.players.find((player) => player.creator) ?? game?.players[0];
  const action = gameAction(game);

  return (
    <a href={href} className={classes.invite}>
      <IconSwords size={14} className={classes.inviteIcon} />
      <span className={classes.inviteTitle}>{t('Game #%{id}', { id })}</span>
      {game && (
        <Text span size="xs" fw={700} c={LEVEL_COLORS[game.level] ?? 'dimmed'}>
          {levelLabel(game.level)}
        </Text>
      )}
      {game?.state === 'waiting_opponent' && creator && (
        <Text span size="xs" c="dimmed">
          {t('%{name} is looking for an opponent', { name: creator.name })}
        </Text>
      )}
      {game?.state === 'playing' && game.players.length > 1 && (
        <Text span size="xs" c="dimmed">
          {game.players.map((player) => player.name).join(' vs ')}
        </Text>
      )}
      <span className={classes.inviteAction} data-color={action.color}>
        {t(action.label)}
      </span>
    </a>
  );
}

function TournamentInvite({ id, href }: { id: number; href: string }) {
  const { t } = useTranslation();
  const tournament = useLobbyStore(
    (state) =>
      state.liveTournaments.find((item) => item.id === id) ?? state.seasonTournaments.find((item) => item.id === id),
  );

  return (
    <a href={href} className={classes.invite}>
      <IconTrophy size={14} className={classes.inviteIcon} />
      <span className={classes.inviteTitle}>
        {tournament ? tournamentTitle(tournament.name, tournament.grade) : t('Tournament #%{id}', { id })}
      </span>
      <span className={classes.inviteAction} data-color="gray">
        {t('Open')}
      </span>
    </a>
  );
}

/** Plain text with "@name" mentions marked (yours stand out) and ":shortcodes:" as emoji. */
function InlineText({ value, myName }: { value: string; myName: string }) {
  const segments = useMemo(() => splitInline(value), [value]);

  return segments.map((segment, index) =>
    segment.kind === 'mention' ? (
      <span
        key={index}
        className={classes.mention}
        data-me={segment.name.toLowerCase() === myName.toLowerCase() || undefined}
      >
        @{segment.name}
      </span>
    ) : segment.kind === 'emoji' ? (
      <Emoji key={index} value={segment.value} />
    ) : (
      <Fragment key={index}>{segment.value}</Fragment>
    ),
  );
}

/** Message text with clickable links; the site's game and tournament links become invite cards. */
export function MessageText({ text }: { text: string }) {
  const { current_user: me } = useSharedProps();
  const segments = useMemo(() => linkify(text), [text]);
  const emoji = useMemo(() => singleEmoji(text), [text]);

  if (emoji) {
    return <span className={classes.standaloneEmoji}><Emoji value={emoji} /></span>;
  }

  return (
    <Text span size="sm" className={classes.text}>
      {segments.map((segment, index) => {
        switch (segment.kind) {
          case 'game':
            return <GameInvite key={index} id={segment.id} href={segment.href} />;
          case 'tournament':
            return <TournamentInvite key={index} id={segment.id} href={segment.href} />;
          case 'link':
            return (
              <Anchor key={index} href={segment.href} target="_blank" rel="noopener noreferrer nofollow" inherit>
                {segment.text}
              </Anchor>
            );
          default:
            return <InlineText key={index} value={segment.value} myName={me.name} />;
        }
      })}
    </Text>
  );
}
