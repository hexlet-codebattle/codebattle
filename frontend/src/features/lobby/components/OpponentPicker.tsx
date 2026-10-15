import { Group, Select, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { InviteUser } from '@/features/invites/store';
import { usePresenceStore } from '@/features/presence/store';
import { useSharedProps } from '@/shared/useSharedProps';

import classes from './OpponentPicker.module.css';

interface Option extends InviteUser {
  online: boolean;
}

async function searchUsers(term: string): Promise<InviteUser[]> {
  const query = new URLSearchParams({ 'q[name_ilike]': term, page_size: '10', with_bots: 'false' });
  const response = await fetch(`/api/v1/users?${query}`);
  if (!response.ok) throw new Error(`users: ${response.status}`);

  return (await response.json()).users;
}

/** Searchable player picker for invites: who's online first, then name search. Never yourself or bots. */
export function OpponentPicker({ value, onChange }: { value: InviteUser | null; onChange: (user: InviteUser | null) => void }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const [search, setSearch] = useState('');
  const [term] = useDebouncedValue(search.trim(), 250);
  const presence = usePresenceStore((state) => state.users);

  const { data: found = [], isFetching } = useQuery({
    queryKey: ['user-search', term],
    queryFn: () => searchUsers(term),
    enabled: term.length >= 2,
    staleTime: 60_000,
  });

  const options = useMemo(() => {
    const online = new Set(presence.map(({ id }) => id));
    const byId = new Map<number, Option>();
    const add = (user: InviteUser) => {
      if (user.id !== me.id && !byId.has(user.id)) byId.set(user.id, { id: user.id, name: user.name, online: online.has(user.id) });
    };

    presence.filter((user) => !user.is_bot).forEach(add);
    found.forEach(add);
    if (value) add(value);

    return [...byId.values()].sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  }, [presence, found, value, me.id]);

  const byValue = new Map(options.map((option) => [String(option.id), option]));

  return (
    <Select
      searchable
      clearable
      placeholder={t('Choose opponent')}
      nothingFoundMessage={term.length < 2 ? t('Type a name to search') : isFetching ? t('Searching…') : t('Nobody found')}
      searchValue={search}
      onSearchChange={setSearch}
      value={value ? String(value.id) : null}
      onChange={(id) => {
        const option = id ? byValue.get(id) : undefined;
        onChange(option ? { id: option.id, name: option.name } : null);
      }}
      data={options.map((option) => ({ value: String(option.id), label: option.name }))}
      renderOption={({ option }) => (
        <Group gap={8} wrap="nowrap">
          <span className={classes.dot} data-online={byValue.get(option.value)?.online || undefined} />
          <Text size="sm">{option.label}</Text>
        </Group>
      )}
    />
  );
}
