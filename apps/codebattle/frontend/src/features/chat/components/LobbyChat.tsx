import { Card } from '@mantine/core';
import { forwardRef } from 'react';

import type { ChatUserRef } from '../types';
import type { ChatApi } from '../useChat';

import { ChatPanel } from './ChatPanel';
import classes from './LobbyChat.module.css';
import { OnlinePlayers } from './OnlinePlayers';

interface LobbyChatProps {
  chat: ChatApi;
  activeRoomId: number | null;
  onRoomChange: (userId: number | null) => void;
  onDirectMessage: (user: ChatUserRef) => void;
}

/** Lobby chat with the online list beside it; chat state lives in the page. */
export const LobbyChat = forwardRef<HTMLDivElement, LobbyChatProps>(function LobbyChat(props, ref) {
  return (
    <Card padding={0} ref={ref} className={classes.card}>
      <ChatPanel {...props} height={380} />
      <aside className={classes.online}>
        <OnlinePlayers onDirectMessage={props.onDirectMessage} />
      </aside>
    </Card>
  );
});
