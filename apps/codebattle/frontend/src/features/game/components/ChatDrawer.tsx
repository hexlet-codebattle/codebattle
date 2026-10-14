import { Drawer } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChatPanel } from '@/features/chat/components/ChatPanel';
import type { ChatApi } from '@/features/chat/useChat';

import classes from '../GameRoom.module.css';

/** The game chat, sliding in from the right so the editors keep the full width. */
export function ChatDrawer({ chat, opened, onClose }: { chat: ChatApi; opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [room, setRoom] = useState<number | null>(null);

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
