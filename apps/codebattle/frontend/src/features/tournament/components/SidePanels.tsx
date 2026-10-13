import { Badge, Card, Group, Tabs, Text } from '@mantine/core';
import { IconListNumbers, IconMessages } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChatPanel } from '@/features/chat/components/ChatPanel';
import { type ChatApi, useChat } from '@/features/chat/useChat';

import type { Tournament } from '../types';
import type { TournamentApi } from '../useTournament';

import { RankingPanel } from './RankingPanel';

/** Messages that arrived while the chat tab wasn't open. */
function useUnread(chat: ChatApi, chatOpen: boolean) {
  const [seen, setSeen] = useState<number | null>(null);
  const total = chat.messages.length;

  // The history from the join counts as read; afterwards, opening the tab reads everything.
  useEffect(() => {
    if (chat.online && seen == null) setSeen(total);
  }, [chat.online, seen, total]);
  useEffect(() => {
    if (chatOpen) setSeen(total);
  }, [chatOpen, total]);

  return seen == null ? 0 : Math.max(0, total - seen);
}

function ChatTab({ chat }: { chat: ChatApi }) {
  const [room, setRoom] = useState<number | null>(null);

  return (
    <ChatPanel
      chat={chat}
      activeRoomId={room}
      onRoomChange={setRoom}
      onDirectMessage={(user) => {
        chat.openRoom(user);
        setRoom(user.id);
      }}
      height={300}
    />
  );
}

function PlayersCount({ tournament }: { tournament: Tournament }) {
  return (
    <Text span size="xs" c="dimmed" ff="monospace">
      {tournament.players_count}
      {tournament.players_limit ? `/${tournament.players_limit}` : ''}
    </Text>
  );
}

/** Ranking and the tournament chat (`chat:t_<id>`) as tabs; the chat joins only when enabled. */
function WithChat({ tournament, api }: { tournament: Tournament; api: TournamentApi }) {
  const { t } = useTranslation();
  const chat = useChat(`chat:t_${tournament.id}`);
  const [tab, setTab] = useState<string | null>('ranking');
  const unread = useUnread(chat, tab === 'chat');

  return (
    <Card padding={0}>
      <Tabs value={tab} onChange={setTab}>
        <Tabs.List px="sm" pt="xs">
          <Tabs.Tab value="ranking" leftSection={<IconListNumbers size={15} />}>
            <Group gap={6} wrap="nowrap">
              {t('Ranking')}
              <PlayersCount tournament={tournament} />
            </Group>
          </Tabs.Tab>
          <Tabs.Tab
            value="chat"
            leftSection={<IconMessages size={15} />}
            rightSection={
              unread > 0 ? (
                <Badge size="xs" circle={unread < 10} color="red" variant="filled">
                  {unread > 99 ? '99+' : unread}
                </Badge>
              ) : null
            }
          >
            {t('Chat')}
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
      {/* Both stay mounted: the ranking keeps its page, the chat its scroll and draft. */}
      <div hidden={tab !== 'ranking'}>
        <RankingPanel api={api} />
      </div>
      <div hidden={tab !== 'chat'}>
        <ChatTab chat={chat} />
      </div>
    </Card>
  );
}

/** Standings card: ranking by default, the chat as a second tab with a new-messages counter. */
export function StandingsCard({ tournament, api }: { tournament: Tournament; api: TournamentApi }) {
  const { t } = useTranslation();

  if (tournament.use_chat && tournament.is_live) return <WithChat tournament={tournament} api={api} />;

  return (
    <Card padding={0}>
      <Group justify="space-between" px="md" pt="sm" pb={4}>
        <Group gap={6}>
          <IconListNumbers size={16} />
          <Text fw={700}>{t('Ranking')}</Text>
        </Group>
        <PlayersCount tournament={tournament} />
      </Group>
      <RankingPanel api={api} />
    </Card>
  );
}
