import { useEffect } from 'react';

import { CreateGameModal } from '@/features/lobby/components/CreateGameModal';

import { useInviteDialog } from './dialog';

/**
 * The "invite to a battle" dialog (opened from hover cards, chat, ?opponent_id=). Needs the
 * invites channel (useInvitesChannel) joined on the same page.
 */
export function InviteDialog() {
  const { opened, opponent, close, setMounted } = useInviteDialog();
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, [setMounted]);
  return <CreateGameModal opened={opened} onClose={close} initialOpponent={opponent} />;
}
