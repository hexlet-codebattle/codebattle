import { Button, Code, Group, Modal, SimpleGrid, Stack, Text } from '@mantine/core';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { parseUtc } from '@/features/lobby/format';
import { t as translate } from '@/i18n';
import { Markdown } from '@/shared/Markdown';

import type { Tournament } from '../types';

// Port of the legacy tournament DetailsModal: grouped settings plus the raw JSON.

const formatValue = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return translate(value ? 'Yes' : 'No');
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : null;
  return String(value);
};

const translated = (value: unknown) => {
  const formatted = formatValue(value);
  return formatted === null ? null : translate(formatted);
};

const utcDate = (value: unknown) => {
  if (!value) return null;
  const date = parseUtc(String(value));
  return `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
};

function Section({ title, items }: { title: string; items: { label: string; value: ReactNode }[] }) {
  const shown = items.filter(({ value }) => value !== null);
  if (shown.length === 0) return null;

  return (
    <Stack gap="xs" p="sm" style={{ background: 'var(--cb-sunken)', borderRadius: 'var(--cb-radius)' }}>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em">
        {title}
      </Text>
      <SimpleGrid cols={2} spacing="sm" verticalSpacing="xs">
        {shown.map(({ label, value }) => (
          <div key={label}>
            <Text size="xs" c="dimmed">
              {label}
            </Text>
            <Text size="sm" fw={600} style={{ wordBreak: 'break-word' }}>
              {value}
            </Text>
          </div>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export function DetailsModal({ tournament, opened, onClose }: { tournament: Tournament; opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [showJson, setShowJson] = useState(false);

  const sections = useMemo(
    () => [
      {
        title: t('Overview'),
        items: [
          { label: t('Name'), value: formatValue(tournament.name) },
          { label: t('State'), value: translated(tournament.state) },
          { label: t('Type'), value: translated(tournament.type) },
          { label: t('Level'), value: translated(tournament.level) },
          { label: t('Access'), value: translated(tournament.access_type) },
          { label: t('Ranking type'), value: translated(tournament.ranking_type) },
        ],
      },
      {
        title: t('Schedule'),
        items: [
          { label: t('Starts at'), value: utcDate(tournament.starts_at) },
          { label: t('Created at'), value: utcDate(tournament.inserted_at) },
          { label: t('Updated at'), value: utcDate(tournament.updated_at) },
          { label: t('Rounds limit'), value: formatValue(tournament.rounds_limit) },
          { label: t('Current round'), value: formatValue(tournament.current_round_position) },
        ],
      },
      {
        title: t('Timeouts'),
        items: [
          { label: t('Timeout mode'), value: translated(tournament.timeout_mode) },
          { label: t('Round timeout'), value: formatValue(tournament.round_timeout_seconds) },
          { label: t('Current round timeout'), value: formatValue(tournament.current_round_timeout_seconds) },
          { label: t('Tournament timeout'), value: formatValue(tournament.tournament_timeout_seconds) },
          { label: t('Break duration'), value: formatValue(tournament.break_duration_seconds) },
        ],
      },
      {
        title: t('Participants'),
        items: [
          { label: t('Players'), value: formatValue(tournament.players_count) },
          { label: t('Players limit'), value: formatValue(tournament.players_limit) },
          { label: t('Chat enabled'), value: formatValue(tournament.use_chat) },
          { label: t('Live'), value: formatValue(tournament.is_live) },
        ],
      },
      {
        title: t('Task'),
        items: [
          { label: t('Task provider'), value: translated(tournament.task_provider) },
          { label: t('Task pack'), value: formatValue(tournament.task_pack_name) },
          { label: t('Task strategy'), value: translated(tournament.task_strategy) },
          { label: t('Event ID'), value: formatValue(tournament.event_id) },
          { label: t('Tournament ID'), value: formatValue(tournament.id) },
        ],
      },
    ],
    [tournament, t],
  );

  return (
    <Modal opened={opened} onClose={onClose} title={t('Tournament details')} size="xl">
      <Stack gap="md">
        {tournament.description && (
          <Stack gap={6} p="sm" style={{ background: 'var(--cb-sunken)', borderRadius: 'var(--cb-radius)' }}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em">
              {t('Description')}
            </Text>
            <Markdown>{tournament.description}</Markdown>
          </Stack>
        )}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
          {sections.map((section) => (
            <Section key={section.title} title={section.title} items={section.items} />
          ))}
        </SimpleGrid>
        {showJson && (
          <Code block mah={400} style={{ overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(tournament, null, 2)}
          </Code>
        )}
        <Group justify="space-between">
          <Button size="xs" variant="outline" color="gray" onClick={() => setShowJson((value) => !value)}>
            {showJson ? t('Hide JSON') : t('Raw JSON')}
          </Button>
          <Button variant="default" onClick={onClose}>
            {t('Close')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
