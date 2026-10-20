import {
  Anchor,
  Button,
  Card,
  Code,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { UserCard } from '@/features/users/UserCard';
import { type Locale, normalizeLocale, SUPPORTED_LOCALES } from '@/i18n';
import { LangIcon } from '@/shared/LangIcon';
import { LocaleSelect } from '@/shared/LocaleSelect';
import { Markdown } from '@/shared/Markdown';
import { availableDescriptionLocales, descriptionField, taskDescriptionLocale } from '@/shared/taskDescription';

import { type Assert, formatDuration, type Task, type TaskStats, typeName } from '../api';

import classes from './TaskPage.module.css';

interface DescriptionCardProps {
  task: Task;
  canEdit: boolean;
  /** Saves one description; rejects on failure (the caller shows the error). */
  onSave: (lang: Locale, text: string) => Promise<void>;
}

export function DescriptionCard({ task, canEdit, onSave }: DescriptionCardProps) {
  const { t, i18n } = useTranslation();
  const availableLocales = availableDescriptionLocales(task);
  // Default to the UI language when that description exists.
  const [selectedLang, setLang] = useState<Locale | null>(null);
  const wanted = selectedLang ?? normalizeLocale(i18n.language);
  const lang = canEdit && selectedLang ? selectedLang : taskDescriptionLocale(task, wanted);
  const [draft, setDraft] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const text = task[descriptionField(lang)] ?? '';
  // Editors can add translations; readers only choose descriptions that exist.
  const locales = canEdit ? SUPPORTED_LOCALES : availableLocales;

  const save = async () => {
    if (draft == null) return;
    setSaving(true);
    try {
      await onSave(lang, draft);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Group justify="space-between" mb="sm">
        <Title order={4}>{t('Description')}</Title>
        <Group gap="xs">
          {(locales.length > 1 || canEdit) && (
            <LocaleSelect
              value={lang}
              onChange={(value) => {
                setLang(value);
                setDraft(null);
              }}
              locales={locales}
              disabled={saving}
              label={t('Task description language')}
            />
          )}
          {canEdit && draft == null && (
            <Button
              size="compact-sm"
              variant="subtle"
              leftSection={<IconPencil size={14} />}
              onClick={() => {
                setLang(lang);
                setDraft(text);
              }}
            >
              {t('Edit')}
            </Button>
          )}
        </Group>
      </Group>

      {draft != null ? (
        <Stack gap="xs">
          <Tabs value={preview ? 'preview' : 'write'} onChange={(value) => setPreview(value === 'preview')}>
            <Tabs.List>
              <Tabs.Tab value="write">{t('Write')}</Tabs.Tab>
              <Tabs.Tab value="preview">{t('Preview')}</Tabs.Tab>
            </Tabs.List>
          </Tabs>
          {preview ? (
            <div className={classes.preview}>
              <Markdown>{draft || '_…_'}</Markdown>
            </div>
          ) : (
            <Textarea
              autosize
              minRows={10}
              maxRows={30}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13 } }}
              aria-label={t('Description')}
            />
          )}
          <Group justify="flex-end" gap="xs">
            <Button size="compact-sm" onClick={() => setDraft(null)}>
              {t('Cancel')}
            </Button>
            <Button size="compact-sm" variant="filled" color="green" loading={saving} onClick={save}>
              {t('Save')}
            </Button>
          </Group>
        </Stack>
      ) : text ? (
        <Markdown>{text}</Markdown>
      ) : (
        <Text size="sm" c="dimmed">
          {t('No description yet.')}
        </Text>
      )}
    </Card>
  );
}

/** `function solution(a: integer, b: array<integer>) -> integer` */
export function SignatureCard({ task }: { task: Task }) {
  const { t } = useTranslation();

  return (
    <Card>
      <Title order={5} mb="xs">
        {t('Function Signature')}
      </Title>
      <code className={classes.signature}>
        <span className={classes.keyword}>function</span> solution(
        {task.input_signature.map((arg, index) => (
          <span key={arg.argument_name}>
            {index > 0 && ', '}
            <span className={classes.argName}>{arg.argument_name}</span>:{' '}
            <span className={classes.argType}>{typeName(arg.type)}</span>
          </span>
        ))}
        ) <span className={classes.keyword}>-&gt;</span>{' '}
        <span className={classes.returnType}>{task.output_signature ? typeName(task.output_signature.type) : 'void'}</span>
      </code>
    </Card>
  );
}

function AssertsTable({ asserts }: { asserts: Assert[] }) {
  const { t } = useTranslation();

  return (
    <ScrollArea type="auto">
      <Table verticalSpacing={4} horizontalSpacing="xs" fz="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={40}>#</Table.Th>
            <Table.Th>{t('Arguments')}</Table.Th>
            <Table.Th>{t('Expected')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {asserts.map((assert, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <Table.Tr key={index}>
              <Table.Td ff="monospace" c="dimmed">
                {index + 1}
              </Table.Td>
              <Table.Td>
                <Code className={classes.value}>{JSON.stringify(assert.arguments)}</Code>
              </Table.Td>
              <Table.Td>
                <Code className={classes.expected}>{JSON.stringify(assert.expected)}</Code>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

const COLLAPSED_ASSERTS = 3;

export function AssertsCards({ task }: { task: Task }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const asserts = task.asserts ?? [];
  const examples = task.asserts_examples ?? [];

  return (
    <>
      {examples.length > 0 && (
        <Card>
          <Title order={5} mb="xs">
            {t('Examples')}
          </Title>
          <AssertsTable asserts={examples} />
        </Card>
      )}
      {asserts.length > 0 && (
        <Card>
          <Group justify="space-between" mb="xs">
            <Title order={5}>{t('Test Cases (%{count})', { count: asserts.length })}</Title>
            {asserts.length > COLLAPSED_ASSERTS && (
              <Button size="compact-xs" variant="subtle" onClick={() => setExpanded((value) => !value)}>
                {expanded ? t('Show less') : t('Show all %{count}', { count: asserts.length })}
              </Button>
            )}
          </Group>
          <AssertsTable asserts={expanded ? asserts : asserts.slice(0, COLLAPSED_ASSERTS)} />
        </Card>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Stack gap={0} align="center" className={classes.stat}>
      <Text ff="monospace" fz={24} fw={800} c="bright">
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Stack>
  );
}

const PERCENTILES = [
  { key: 'p10', label: 'P10', tone: 'var(--cb-success)' },
  { key: 'p30', label: 'P30', tone: 'var(--cb-success)' },
  { key: 'p50', label: 'P50', tone: 'var(--cb-grade-grand_slam)' },
  { key: 'p75', label: 'P75', tone: 'var(--cb-grade-grand_slam)' },
  { key: 'p95', label: 'P95', tone: 'var(--cb-danger)' },
] as const;

export function StatsCard({ stats }: { stats: TaskStats }) {
  const { t } = useTranslation();
  const { percentiles } = stats;
  const winRate = stats.games_count ? Math.round((stats.winners_count / stats.games_count) * 100) : null;
  const scale = percentiles.p95 || 1;

  return (
    <Card>
      <Title order={5} mb="sm">
        {t('Statistics')}
      </Title>
      <SimpleGrid cols={3} spacing={0} className={classes.stats} mb="md">
        <Stat label={t('Games')} value={stats.games_count} />
        <Stat label={t('Winners')} value={stats.winners_count} />
        <Stat label={t('Win rate')} value={winRate == null ? '—' : `${winRate}%`} />
      </SimpleGrid>

      <Text size="sm" fw={600} mb={6}>
        {t('Solve Time (winners)')}
      </Text>
      {percentiles.count === 0 ? (
        <Text size="sm" c="dimmed" fs="italic">
          {t('No solve time data yet')}
        </Text>
      ) : (
        <Stack gap={6}>
          {PERCENTILES.filter(({ key }) => percentiles[key] != null).map(({ key, label, tone }) => (
            <div key={key} className={classes.barRow}>
              <Text size="xs" ff="monospace" c="dimmed">
                {label}
                {key === 'p50' && ` · ${t('median')}`}
              </Text>
              <div className={classes.barTrack}>
                <div
                  className={classes.barFill}
                  style={{ width: `${Math.min(((percentiles[key] ?? 0) / scale) * 100, 100)}%`, background: tone }}
                />
              </div>
              <Text size="sm" ff="monospace" fw={700} c="bright" ta="right">
                {formatDuration(percentiles[key])}
              </Text>
            </div>
          ))}
          <Text fz={11} c="dimmed">
            {t('Based on %{count} winning games.', { count: percentiles.count })}
          </Text>
        </Stack>
      )}
    </Card>
  );
}

export function LeaderboardCard({ stats }: { stats: TaskStats }) {
  const { t } = useTranslation();

  if (stats.leaderboard.length === 0) return null;

  return (
    <Card padding={0}>
      <Title order={5} p="md" pb="xs">
        {t('Fastest Solutions')}
      </Title>
      <ScrollArea type="auto">
        <Table verticalSpacing={4} horizontalSpacing="sm" fz="sm" miw={420}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}>#</Table.Th>
              <Table.Th>{t('Player')}</Table.Th>
              <Table.Th ta="right">{t('Time')}</Table.Th>
              <Table.Th ta="right">{t('Game')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {stats.leaderboard.map((row, index) => (
              <Table.Tr key={row.game_id}>
                <Table.Td>
                  <span className={classes.place} data-place={index < 3 ? index + 1 : undefined}>
                    {index + 1}
                  </span>
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <LangIcon lang={row.lang} />
                    <UserCard user={{ id: row.user_id, name: row.user_name }}>
                      <Text span size="sm" fw={600} c="bright">
                        {row.user_name}
                      </Text>
                    </UserCard>
                    <Text span size="xs" c="dimmed" ff="monospace">
                      {row.rating}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td ta="right" ff="monospace" fw={700}>
                  {formatDuration(row.duration_sec)}
                </Table.Td>
                <Table.Td ta="right">
                  <Anchor href={`/games/${row.game_id}`} size="sm" ff="monospace">
                    #{row.game_id}
                  </Anchor>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
