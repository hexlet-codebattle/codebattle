import { Button, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';

import { useChannel } from '@/api/useChannel';
import { t } from '@/i18n';
import { blinkTitleUntilVisible } from '@/shared/blinkTitle';
import { useSharedProps } from '@/shared/useSharedProps';

import { acceptInvite, cancelInvite, enterAcceptedGame } from './actions';
import { type Invite, useInvitesStore } from './store';

const name = (user?: { name: string }) => user?.name ?? t('Anonymous');

function showIncoming(invite: Invite) {
  const id = `invite-${invite.id}`;

  notifications.show({
    id,
    color: 'green',
    autoClose: false,
    title: t('Battle invite'),
    message: (
      <>
        {t('%{name} invites you to a battle', { name: name(invite.creator) })}
        <Group gap="xs" mt="xs">
          <Button
            size="compact-sm"
            variant="filled"
            color="green"
            onClick={() => {
              notifications.hide(id);
              void acceptInvite(invite.id);
            }}
          >
            {t('Accept')}
          </Button>
          <Button
            size="compact-sm"
            onClick={() => {
              notifications.hide(id);
              void cancelInvite(invite.id);
            }}
          >
            {t('Decline')}
          </Button>
        </Group>
      </>
    ),
  });
  blinkTitleUntilVisible(`⚔️ ${t('Battle invite')}`);
}

/**
 * Joins "invites" (signed-in users only) and keeps the invites store in sync.
 * Incoming invites pop up as toasts with Accept/Decline; an accepted invite
 * sends both players into the game. Mounted once per page by AppLayout (or the game page).
 */
export function useInvitesChannel(enabled: boolean) {
  const { current_user: user } = useSharedProps();
  const { setAll, upsert } = useInvitesStore.getState();
  const byOthers = (invite: Partial<Invite>) => invite.executor_id != null && invite.executor_id !== user.id;

  const { push } = useChannel(enabled ? 'invites' : null, {
    events: {
      'invites:init': ({ invites }: { invites: Invite[] }) => setAll(invites),

      'invites:created': ({ invite }: { invite: Invite }) => {
        upsert(invite);
        if (invite.creator_id !== user.id) showIncoming(invite);
      },

      'invites:accepted': ({ invite }: { invite: Invite }) => {
        upsert(invite);
        notifications.hide(`invite-${invite.id}`);
        if (byOthers(invite)) {
          notifications.show({
            color: 'green',
            title: t('Invite accepted'),
            message: t('%{name} accepted your invite. Starting the battle…', { name: name(invite.recipient) }),
          });
        }
        enterAcceptedGame(invite);
      },

      'invites:canceled': ({ invite }: { invite: Invite }) => {
        upsert(invite);
        notifications.hide(`invite-${invite.id}`);
        if (byOthers(invite)) {
          const other = invite.executor_id === invite.creator_id ? invite.creator : invite.recipient;
          notifications.show({ color: 'red', message: t('%{name} canceled the invite', { name: name(other) }) });
        }
      },

      // These carry only {id, state}; expired even arrives with the *old* state,
      // so trust the event name.
      'invites:expired': ({ invite }: { invite: Pick<Invite, 'id'> }) => {
        upsert({ id: invite.id, state: 'expired' });
        notifications.hide(`invite-${invite.id}`);
      },
      'invites:dropped': ({ invite }: { invite: Pick<Invite, 'id'> }) => {
        upsert({ id: invite.id, state: 'dropped' });
        notifications.hide(`invite-${invite.id}`);
      },
    },
  });

  useEffect(() => {
    useInvitesStore.setState({ push });
  }, [push]);
}
