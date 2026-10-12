import { notifications } from '@mantine/notifications';

import { t } from '@/i18n';

import { type CreateInviteParams, type Invite, useInvitesStore } from './store';

export const gameUrl = (gameId: number) => `/games/${gameId}`;

// Server error reasons (Codebattle.Invite / InviteChannel) → user-facing text.
const REASONS: Record<string, string> = {
  invalid_recipient: "You can't invite yourself.",
  recipient_not_found: "This player can't be invited.",
  already_invited: 'There is already a pending invite between you two.',
  not_found: 'Invite not found.',
  invite_is_not_pending: 'This invite is no longer active.',
  already_in_a_game: 'One of you is already in a game.',
  draining: 'The server is restarting. Try again in a moment.',
};

export function inviteErrorText(error: unknown) {
  const reason = (error as { reason?: string } | null)?.reason;
  return t(reason && REASONS[reason] ? REASONS[reason] : 'Something went wrong. Try again.');
}

const fail = (error: unknown) => {
  notifications.show({ color: 'red', title: t('Invite'), message: inviteErrorText(error) });
};

/** Both sides land in the new game shortly after an accept (legacy: 250ms). */
export const enterAcceptedGame = (invite: Invite) => {
  if (invite.game_id) window.setTimeout(() => window.location.assign(gameUrl(invite.game_id!)), 250);
};

/** Resolves with the created invite; rejects with the server's `{reason}` (callers show it inline). */
export async function createInvite(params: CreateInviteParams) {
  const { push, upsert } = useInvitesStore.getState();
  const { invite } = await push<{ invite: Invite }>('invites:create', { ...params });
  upsert(invite);
  return invite;
}

export async function acceptInvite(id: number) {
  const { push, upsert } = useInvitesStore.getState();

  try {
    const { invite } = await push<{ invite: Invite }>('invites:accept', { id });
    upsert(invite);
    enterAcceptedGame(invite);
  } catch (error) {
    const invite = (error as { invite?: Invite } | null)?.invite;
    upsert(invite ?? { id, state: 'invalid' });
    fail(error);
  }
}

/** Decline (recipient) and cancel (creator) are the same server action. */
export async function cancelInvite(id: number) {
  const { push, upsert } = useInvitesStore.getState();

  try {
    const { invite } = await push<{ invite: Invite }>('invites:cancel', { id });
    upsert(invite);
  } catch (error) {
    upsert({ id, state: 'invalid' });
    fail(error);
  }
}
