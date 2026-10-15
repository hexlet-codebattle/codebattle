import { Head } from '@inertiajs/react';
import { Alert, Grid, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlugConnectedX } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LobbyChat } from '@/features/chat/components/LobbyChat';
import type { ChatUserRef } from '@/features/chat/types';
import { useChat } from '@/features/chat/useChat';
import { useInviteDialog } from '@/features/invites/dialog';
import { ActiveGamesModal } from '@/features/lobby/components/ActiveGamesModal';
import { CreateGameModal, type CreateGameParams } from '@/features/lobby/components/CreateGameModal';
import { LeagueBanner } from '@/features/lobby/components/LeagueBanner';
import { Leaderboard } from '@/features/lobby/components/Leaderboard';
import { ProfileCard } from '@/features/lobby/components/ProfileCard';
import { Tournaments } from '@/features/lobby/components/Tournaments';
import { isPlayer } from '@/features/lobby/format';
import { useLobbyStore } from '@/features/lobby/store';
import type { LobbyJoinReply } from '@/features/lobby/types';
import { gameUrl, useLobbyChannel } from '@/features/lobby/useLobbyChannel';
import { useVisibleGames } from '@/features/lobby/useVisibleGames';
import { AppLayout } from '@/layout/AppLayout';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from RootController.index (render_inertia("Lobby", ...)).
interface LobbyProps extends LobbyJoinReply {
  task_tags: string[];
  /** From /?opponent_id=ID: open the invite dialog for this player. */
  opponent: { id: number; name: string } | null;
}

export default function Lobby() {
  const { t } = useTranslation();
  const props = useSharedProps<LobbyProps>();
  const user = props.current_user;

  // Render server data immediately; the channel join reply then replaces it.
  useState(() => useLobbyStore.getState().reset(props));

  const { status, push, cast } = useLobbyChannel();
  const online = status === 'joined';
  const [createOpened, createModal] = useDisclosure(false);
  const [joinOpened, joinModal] = useDisclosure(false);
  const visibleGames = useVisibleGames(user.id);

  const games = useLobbyStore((state) => state.games);
  const activeGame = useMemo(() => games.find((game) => isPlayer(game, user.id)), [games, user.id]);

  // The random-player game we are waiting in. Right after creation it may not be in the
  // store yet, so remember its id until the channel delivers it.
  const [createdGameId, setCreatedGameId] = useState<number | null>(null);
  const waitingGameId = activeGame?.state === 'waiting_opponent' ? activeGame.id : null;
  if (createdGameId !== null && createdGameId === waitingGameId) setCreatedGameId(null);

  // Chat state lives here so other widgets can open private rooms in it.
  const chat = useChat('chat:lobby');
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const openDirect = (peer: ChatUserRef) => {
    chat.openRoom(peer);
    setActiveRoomId(peer.id);
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // /?opponent_id=ID (links from profiles and the legacy UI): invite that player, then clean the URL.
  const opponent = props.opponent;
  useEffect(() => {
    if (!opponent) return;
    useInviteDialog.getState().open({ id: opponent.id, name: opponent.name });
    window.history.replaceState({}, document.title, '/');
  }, [opponent]);

  const createGame = async (params: CreateGameParams) => {
    const { game_id: gameId } = await push<{ game_id: number }>('game:create', { ...params });

    // Bot games start right away.
    if (params.opponent_type === 'bot') {
      window.location.assign(gameUrl(gameId));
      return;
    }

    // Random-player games wait here in the lobby (we enter once someone joins); the invite goes to the chat.
    setCreatedGameId(gameId);
    chat.shareGame(gameId);
  };

  // The server also drops the game's invite from the lobby chat.
  const cancelGame = (gameId: number) => {
    cast('game:cancel', { game_id: gameId });
    setCreatedGameId(null);
    useLobbyStore.getState().removeGame(gameId);
  };

  const closeCreate = () => {
    createModal.close();
    // Reopening falls back to the store, which by then has the game (or knows it is gone).
    setCreatedGameId(null);
  };

  return (
    <AppLayout presence="lobby">
      <Head title={t('Lobby')} />
      {status === 'error' && (
        <Alert color="red" icon={<IconPlugConnectedX size={18} />} mb="md">
          {t('Connection lost. Reconnecting…')}
        </Alert>
      )}
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, md: 8 }} order={{ base: 2, md: 1 }}>
          <Stack gap="xl">
            <Tournaments isAdmin={Boolean(user.is_admin)} />
            <LobbyChat
              ref={chatRef}
              chat={chat}
              activeRoomId={activeRoomId}
              onRoomChange={setActiveRoomId}
              onDirectMessage={openDirect}
            />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }} order={{ base: 1, md: 2 }}>
          <Stack gap="lg">
            <ProfileCard
              activeGame={activeGame}
              online={online}
              gamesCount={
                // The lobby always holds a few bot games waiting for a player; count only the rest.
                visibleGames.filter((game) => !(game.is_bot && game.state === 'waiting_opponent')).length
              }
              onCreate={createModal.open}
              onJoin={joinModal.open}
            />
            <LeagueBanner />
            <Leaderboard />
          </Stack>
        </Grid.Col>
      </Grid>
      <ActiveGamesModal
        opened={joinOpened}
        onClose={joinModal.close}
        userId={user.id}
        online={online}
        onCancel={cancelGame}
      />
      <CreateGameModal
        opened={createOpened}
        onClose={closeCreate}
        taskTags={props.task_tags}
        onCreate={createGame}
        waitingGameId={waitingGameId ?? createdGameId}
        onCancelGame={(gameId) => {
          cancelGame(gameId);
          createModal.close();
        }}
      />
    </AppLayout>
  );
}
