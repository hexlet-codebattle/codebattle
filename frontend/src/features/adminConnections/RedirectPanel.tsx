import { Button, Card, Group, Select, Text, Textarea, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowForwardUp, IconDownload, IconUsers, IconX } from '@tabler/icons-react';
import { type Dispatch, type FormEvent, type SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMainChannelStore } from '@/features/main/store';

import { mergeUserIds, parseUserIds } from './connections';

type RouteKey = 'group_tournaments' | 'games' | 'tournaments' | 'events';

const ROUTES: Record<RouteKey, { label: string; placeholder: string; build: (id: string) => string }> = {
  group_tournaments: { label: 'Group Tournament', placeholder: 'ID', build: (id) => `/group_tournaments/${id}` },
  games: { label: 'Game', placeholder: 'Game ID', build: (id) => `/games/${id}` },
  tournaments: { label: 'Tournament', placeholder: 'Tournament ID', build: (id) => `/tournaments/${id}` },
  events: { label: 'Event', placeholder: 'Event slug', build: (slug) => `/e/${slug}` },
};

interface RedirectPanelProps {
  /** Free-text id list, shared with the page so user chips can add to it. */
  userIdsText: string;
  setUserIdsText: Dispatch<SetStateAction<string>>;
  connectedUserIds: number[];
}

/** Send chosen users to a page via "main:redirect" (admins are skipped by the server). */
export function RedirectPanel({ userIdsText, setUserIdsText, connectedUserIds }: RedirectPanelProps) {
  const { t } = useTranslation();
  const push = useMainChannelStore((state) => state.push);
  const [tournamentId, setTournamentId] = useState('');
  const [route, setRoute] = useState<RouteKey>('group_tournaments');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState<'fetch' | 'send' | null>(null);

  const userIds = parseUserIds(userIdsText);

  const fetchPlayers = async (event: FormEvent) => {
    event.preventDefault();
    const id = tournamentId.trim();
    if (!id) return;

    setBusy('fetch');
    try {
      const reply = await push<{ user_ids: number[] }>('tournament:player_ids', { tournament_id: id });
      const ids = reply?.user_ids ?? [];
      setUserIdsText((current) => mergeUserIds(current, ids));
      notifications.show({ color: 'green', message: t('Fetched %{count} player IDs', { count: ids.length }) });
    } catch {
      notifications.show({ color: 'red', message: t('Tournament not found') });
    } finally {
      setBusy(null);
    }
  };

  const redirect = async (event: FormEvent) => {
    event.preventDefault();
    const id = target.trim();
    if (!id || userIds.length === 0) return;

    setBusy('send');
    try {
      await push('main:redirect', { url: ROUTES[route].build(id), user_ids: userIds });
      notifications.show({ color: 'green', message: t('Redirect sent') });
    } catch {
      notifications.show({ color: 'red', message: t('Redirect failed') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card mb="lg" padding="sm">
      <Text fw={700} ta="center" mb="xs">
        {t('Redirect users')}
      </Text>

      <Group component="form" gap="xs" mb="xs" onSubmit={fetchPlayers}>
        <TextInput
          size="xs"
          w={160}
          placeholder={t('Tournament ID')}
          aria-label={t('Tournament ID')}
          value={tournamentId}
          onChange={(event) => setTournamentId(event.currentTarget.value)}
        />
        <Button
          type="submit"
          size="xs"
          variant="default"
          leftSection={<IconDownload size={14} />}
          disabled={!tournamentId.trim()}
          loading={busy === 'fetch'}
        >
          {t('Fetch player IDs')}
        </Button>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconUsers size={14} />}
          disabled={connectedUserIds.length === 0}
          onClick={() => setUserIdsText((current) => mergeUserIds(current, connectedUserIds))}
        >
          {t('All (%{count})', { count: connectedUserIds.length })}
        </Button>
        <Button
          size="xs"
          variant="subtle"
          color="gray"
          leftSection={<IconX size={14} />}
          disabled={!userIdsText}
          onClick={() => setUserIdsText('')}
        >
          {t('Clear')}
        </Button>
      </Group>

      <Textarea
        size="xs"
        mb="xs"
        autosize
        minRows={2}
        maxRows={6}
        placeholder={t('User IDs (comma or space separated)')}
        aria-label={t('User IDs (comma or space separated)')}
        value={userIdsText}
        onChange={(event) => setUserIdsText(event.currentTarget.value)}
      />

      <Group component="form" gap="xs" onSubmit={redirect}>
        <Select
          size="xs"
          w={180}
          aria-label={t('Page')}
          allowDeselect={false}
          data={Object.entries(ROUTES).map(([value, item]) => ({ value, label: t(item.label) }))}
          value={route}
          onChange={(value) => value && setRoute(value as RouteKey)}
        />
        <TextInput
          size="xs"
          w={160}
          placeholder={t(ROUTES[route].placeholder)}
          aria-label={t(ROUTES[route].placeholder)}
          value={target}
          onChange={(event) => setTarget(event.currentTarget.value)}
        />
        <Button
          type="submit"
          size="xs"
          variant="default"
          leftSection={<IconArrowForwardUp size={14} />}
          disabled={!target.trim() || userIds.length === 0}
          loading={busy === 'send'}
        >
          {t('Redirect (%{count})', { count: userIds.length })}
        </Button>
      </Group>
    </Card>
  );
}
