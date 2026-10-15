import { Drawer } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { ChatPanel } from '@/features/chat/components/ChatPanel';
import type { ChatApi } from '@/features/chat/useChat';

import classes from '../GameRoom.module.css';

/** The game chat, sliding in from the right so the editors keep the full width. */
interface ChatDrawerProps {
  chat: ChatApi;
  opened: boolean;
  onClose: () => void;
  /** The open private room (peer id), or null for General; owned above so the mini chat can open DMs. */
  room: number | null;
  onRoomChange: (room: number | null) => void;
}

export function ChatDrawer({ chat, opened, onClose, room, onRoomChange: setRoom }: ChatDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={400}
      title={t('Chat')}
      // Keep the chat mounted so it holds its scroll and draft between openings.
      keepMounted
      classNames={{ content: classes.chatDrawer, body: classes.chatDrawerBody }}
    >
      <ChatPanel
        chat={chat}
        activeRoomId={room}
        onRoomChange={setRoom}
        onDirectMessage={(user) => {
          chat.openRoom(user);
          setRoom(user.id);
        }}
        height="fill"
      />
    </Drawer>
  );
}
