import React, { useState, useCallback, useMemo, type ReactNode } from 'react';

import { camelizeKeys, decamelizeKeys } from 'humps';
import {
  Badge,
  Box,
  Button,
  Code,
  Flex,
  Grid,
  Loader,
  NativeSelect,
  Paper,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';

import i18n from '../../../i18n';
import GameLevelBadge from '../../components/GameLevelBadge';
import TaskDescriptionMarkdown from '../game/TaskDescriptionMarkdown';

interface Signature {
  argumentName?: string;
  type?: { name?: string; nested?: Signature['type'] };
}

interface AssertExample {
  arguments: unknown;
  expected: unknown;
}

interface Task {
  id: number;
  name: string;
  level: string;
  state: string;
  visibility?: string;
  origin?: string;
  type?: string;
  tags?: string[];
  descriptionEn?: string;
  descriptionRu?: string;
  inputSignature?: Signature[];
  outputSignature?: Signature;
  assertsExamples?: AssertExample[];
  asserts?: AssertExample[];
  timeToSolveSec?: number;
  baseScore?: number;
  creatorId?: number;
  insertedAt?: string;
  updatedAt?: string;
}

interface Percentiles {
  count: number;
  p10?: number;
  p30?: number;
  p50?: number;
  p75?: number;
  p95?: number;
  [key: string]: number | undefined;
}

interface LeaderboardEntry {
  gameId: number;
  userId: number;
  userName: string;
  rating: number;
  durationSec: number;
  lang: string;
}

interface TaskStats {
  gamesCount: number;
  winnersCount: number;
  percentiles: Percentiles;
  leaderboard: LeaderboardEntry[];
}

export interface TaskPreviewWidgetProps {
  task: unknown;
  taskStats: unknown;
  canEditTask?: boolean;
}

const levelOptions = ['elementary', 'easy', 'medium', 'hard'];
const visibilityOptions = ['public', 'hidden'];
const stateOptions = ['blank', 'draft', 'on_moderation', 'active', 'disabled'];

const levelBadgeColors: Record<string, string> = {
  elementary: 'green',
  easy: 'cyan',
  medium: 'yellow',
  hard: 'red',
};

const stateLabels: Record<string, { label: string; color: string }> = {
  blank: { label: 'Blank', color: 'gray' },
  draft: { label: 'Draft', color: 'gray' },
  on_moderation: { label: 'On Moderation', color: 'yellow' },
  active: { label: 'Active', color: 'green' },
  disabled: { label: 'Disabled', color: 'red' },
};

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return '-';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function getCsrfToken(): string {
  return (
    (window as unknown as { csrf_token?: string }).csrf_token ||
    document.querySelector("meta[name='csrf-token']")?.getAttribute('content') ||
    ''
  );
}

async function patchTask(taskId: number, params: Record<string, unknown>) {
  const response = await fetch(`/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': getCsrfToken(),
    },
    body: JSON.stringify({ task: decamelizeKeys(params, { separator: '_' }) }),
  });

  if (!response.ok) throw new Error('Failed to update task');
  const data = await response.json();
  return camelizeKeys(data.task);
}

interface EditableSelectProps {
  value: string | undefined;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

function EditableSelect({ value, options, onChange, disabled }: EditableSelectProps) {
  return (
    <NativeSelect
      size="xs"
      data={options.map((opt) => ({ value: opt, label: i18n.t(opt) }))}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      disabled={disabled}
    />
  );
}

interface EditableTagsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  inputId?: string;
}

function EditableTagsInput({ value, onChange, disabled, inputId }: EditableTagsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const tag = inputValue.trim().toLowerCase();
      if (!value.includes(tag)) {
        onChange([...value, tag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div>
      <Flex wrap="wrap" mb={4}>
        {value.map((tag) => (
          <Badge key={tag} mr={4} mb={4} style={{ backgroundColor: '#343a40', color: '#fff' }}>
            {tag}
            {!disabled && (
              <UnstyledButton
                component="span"
                ml={4}
                c="white"
                style={{ fontSize: '0.8rem', lineHeight: 1 }}
                onClick={() => removeTag(tag)}
              >
                &times;
              </UnstyledButton>
            )}
          </Badge>
        ))}
      </Flex>
      {!disabled && (
        <TextInput
          id={inputId}
          aria-label={i18n.t('Add tag')}
          size="xs"
          placeholder={i18n.t('Add tag...')}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  );
}

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Stack align="center" gap={4} p="md" className="cb-bg-highlight-panel cb-rounded" flex={1}>
      <Text size="xs" tt="uppercase" className="cb-text" style={{ letterSpacing: 1 }}>
        {label}
      </Text>
      <Text fw={700} c="white" fz="lg">
        {value}
      </Text>
    </Stack>
  );
}

interface PercentileBarProps {
  percentiles?: Percentiles | null;
}

function PercentileBar({ percentiles }: PercentileBarProps) {
  if (!percentiles || percentiles.count === 0) {
    return (
      <Text fs="italic" className="cb-text" py="xs">
        {i18n.t('No solve time data yet')}
      </Text>
    );
  }

  const entries = [
    { key: 'p10', label: 'P10', color: '#28a745' },
    { key: 'p30', label: 'P30', color: '#28a745' },
    { key: 'p50', label: 'P50 (median)', color: '#ffc107' },
    { key: 'p75', label: 'P75', color: '#ffc107' },
    { key: 'p95', label: 'P95', color: '#dc3545' },
  ];

  const maxVal = percentiles.p95 || 1;

  return (
    <div>
      {entries.map(({ key, label, color }) => {
        const val = percentiles[key];
        if (val == null) return null;
        const pct = Math.min((val / maxVal) * 100, 100);
        return (
          <Flex key={key} align="center" mb="xs">
            <Text size="xs" className="cb-text" style={{ width: 110, flexShrink: 0 }}>
              {label}
            </Text>
            <Box
              className="cb-bg-highlight-panel"
              style={{
                flexGrow: 1,
                height: 24,
                borderRadius: '0.25rem',
                overflow: 'hidden',
              }}
            >
              <Box
                style={{
                  width: `${pct}%`,
                  minWidth: 2,
                  height: '100%',
                  borderRadius: '0.25rem',
                  backgroundColor: color,
                  transition: 'width 0.5s ease',
                }}
              />
            </Box>
            <Text c="white" size="xs" fw={700} ta="right" style={{ width: 70, flexShrink: 0 }}>
              {formatDuration(val)}
            </Text>
          </Flex>
        );
      })}
    </div>
  );
}

interface SignatureDisplayProps {
  inputSignature?: Signature[];
  outputSignature?: Signature;
}

function SignatureDisplay({ inputSignature, outputSignature }: SignatureDisplayProps) {
  if ((!inputSignature || inputSignature.length === 0) && !outputSignature) return null;

  const formatType = (sig: Signature | undefined): string => {
    if (!sig || !sig.type) return 'unknown';
    const t = sig.type;
    if (t.nested) return `${t.name}<${formatType({ type: t.nested })}>`;
    return t.name || 'unknown';
  };

  return (
    <Box
      className="cb-bg-highlight-panel cb-rounded"
      p="md"
      style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}
    >
      <Text size="xs" component="span" c="cyan">
        function
      </Text>
      {' solution('}
      {inputSignature &&
        inputSignature.map((sig, i) => (
          <span key={sig.argumentName || i}>
            {i > 0 && ', '}
            <Text size="xs" component="span" c="white">
              {sig.argumentName}
            </Text>
            <Text size="xs" component="span" className="cb-text">
              :{' '}
            </Text>
            <Text size="xs" component="span" c="yellow">
              {formatType(sig)}
            </Text>
          </span>
        ))}
      {') -> '}
      <Text size="xs" component="span" c="green">
        {outputSignature ? formatType(outputSignature) : 'void'}
      </Text>
    </Box>
  );
}

interface ExamplesTableProps {
  examples?: AssertExample[];
}

function ExamplesTable({ examples }: ExamplesTableProps) {
  if (!examples || examples.length === 0) return null;

  return (
    <Table.ScrollContainer minWidth={480}>
      <Table withRowBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th className="cb-text" px="md" py="xs">
              #
            </Table.Th>
            <Table.Th className="cb-text" px="md" py="xs">
              {i18n.t('Arguments')}
            </Table.Th>
            <Table.Th className="cb-text" px="md" py="xs">
              {i18n.t('Expected')}
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {examples.map((ex, i) => (
            <Table.Tr key={i}>
              <Table.Td
                className="cb-text"
                px="md"
                py="xs"
                style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}
              >
                {i + 1}
              </Table.Td>
              <Table.Td px="md" py="xs">
                <Code c="cyan" bg="transparent">
                  {JSON.stringify(ex.arguments)}
                </Code>
              </Table.Td>
              <Table.Td px="md" py="xs">
                <Code c="green" bg="transparent">
                  {JSON.stringify(ex.expected)}
                </Code>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

interface LeaderboardProps {
  entries?: LeaderboardEntry[];
}

function Leaderboard({ entries }: LeaderboardProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <Paper withBorder radius="md" mb="md" className="cb-bg-panel">
      <Box p="md">
        <Title order={5} c="white" mb="md">
          {i18n.t('Fastest Solutions')}
        </Title>
        <Table.ScrollContainer minWidth={600}>
          <Table withRowBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th className="cb-text" px="xs" py="xs">
                  #
                </Table.Th>
                <Table.Th className="cb-text" px="xs" py="xs">
                  {i18n.t('Player')}
                </Table.Th>
                <Table.Th className="cb-text" px="xs" py="xs">
                  {i18n.t('Time')}
                </Table.Th>
                <Table.Th className="cb-text" px="xs" py="xs">
                  {i18n.t('Lang')}
                </Table.Th>
                <Table.Th className="cb-text" px="xs" py="xs">
                  {i18n.t('Game')}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entries.map((entry, i) => (
                <Table.Tr key={entry.gameId}>
                  <Table.Td className="cb-text" px="xs" py="xs">
                    {i + 1}
                  </Table.Td>
                  <Table.Td px="xs" py="xs">
                    <Text component="a" href={`/users/${entry.userId}`} c="white" td="none">
                      {entry.userName}
                    </Text>
                    <Text component="small" ml={4} className="cb-text">
                      ({entry.rating})
                    </Text>
                  </Table.Td>
                  <Table.Td c="white" fw={700} px="xs" py="xs">
                    {formatDuration(entry.durationSec)}
                  </Table.Td>
                  <Table.Td className="cb-text" px="xs" py="xs">
                    {entry.lang}
                  </Table.Td>
                  <Table.Td px="xs" py="xs">
                    <Text
                      component="a"
                      href={`/games/${entry.gameId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      c="cyan"
                    >
                      #{entry.gameId}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Box>
    </Paper>
  );
}

interface MetaRowProps {
  label: ReactNode;
  children: ReactNode;
}

function MetaRow({ label, children }: MetaRowProps) {
  return (
    <Flex
      justify="space-between"
      align="center"
      py="xs"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Text component="dt" className="cb-text" fw={400} size="xs">
        {label}
      </Text>
      <Text component="dd" c="white" size="xs">
        {children}
      </Text>
    </Flex>
  );
}

interface AssertsSectionProps {
  asserts: AssertExample[];
}

function AssertsSection({ asserts }: AssertsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const displayAsserts = expanded ? asserts : asserts.slice(0, 3);

  return (
    <Paper withBorder radius="md" mb="md" className="cb-bg-panel">
      <Box p="md">
        <Flex justify="space-between" align="center" mb="md">
          <Title order={5} c="white">
            {i18n.t('Test Cases (%{count})', { count: asserts.length })}
          </Title>
          {asserts.length > 3 && (
            <Button
              size="compact-sm"
              variant="outline"
              color="cbSecondary"
              radius="md"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded
                ? i18n.t('Show less')
                : i18n.t('Show all %{count}', { count: asserts.length })}
            </Button>
          )}
        </Flex>
        <ExamplesTable examples={displayAsserts} />
      </Box>
    </Paper>
  );
}

function TaskPreviewWidget({
  task: taskData,
  taskStats: taskStatsData,
  canEditTask = false,
}: TaskPreviewWidgetProps) {
  const initialTask = useMemo(
    () => (taskData ? (camelizeKeys(taskData) as Task) : null),
    [taskData],
  );
  const taskStats = useMemo(
    () => (taskStatsData ? (camelizeKeys(taskStatsData) as TaskStats) : null),
    [taskStatsData],
  );
  const [task, setTask] = useState(initialTask);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [descLang, setDescLang] = useState('en');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  const description = useMemo(() => {
    if (!task) return '';
    return descLang === 'ru' && task.descriptionRu ? task.descriptionRu : task.descriptionEn || '';
  }, [task, descLang]);

  const hasRuDescription = task && task.descriptionRu && task.descriptionRu.length > 0;

  const updateField = useCallback(
    async (field: string, value: unknown) => {
      if (!task) return;
      setIsSaving(true);
      try {
        const updated = await patchTask(task.id, { [field]: value });
        setTask(updated);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to update:', e);
      } finally {
        setIsSaving(false);
      }
    },
    [task],
  );

  const handlePlayTask = useCallback(async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/games/create_by_task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ task_id: task?.id }),
      });

      if (response.ok) {
        const data = await response.json();
        window.open(`/games/${data.game_id}`, '_blank');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to create game:', e);
    } finally {
      setIsCreating(false);
    }
  }, [task]);

  const startEditDesc = useCallback(() => {
    setDescDraft(descLang === 'ru' ? task?.descriptionRu || '' : task?.descriptionEn || '');
    setEditingDesc(true);
  }, [task, descLang]);

  const saveDesc = useCallback(async () => {
    const field = descLang === 'ru' ? 'descriptionRu' : 'descriptionEn';
    await updateField(field, descDraft);
    setEditingDesc(false);
  }, [descLang, descDraft, updateField]);

  if (!task) {
    return (
      <Flex justify="center" align="center" className="cb-text" style={{ minHeight: '50vh' }}>
        {i18n.t('Task not found')}
      </Flex>
    );
  }

  const stateInfo = stateLabels[task.state] || stateLabels.blank;

  return (
    <Box className="cb-bg-panel cb-text" mih="100vh">
      {/* Header */}
      <Box
        className="cb-bg-highlight-panel"
        py="lg"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Box w="100%" maw={1140} mx="auto" px="md">
          <Flex align="center" mb="md">
            <Text component="a" href="/tasks" c="cyan" size="xs">
              {i18n.t('Tasks')}
            </Text>
            <Text size="xs" mx="xs" className="cb-text">
              /
            </Text>
            <Text size="xs" className="cb-text">
              {task.name}
            </Text>
            {isSaving && (
              <Flex align="center" ml="xs">
                <Loader size="xs" mr={4} />
                <Text size="xs" c="yellow">
                  {i18n.t('Saving...')}
                </Text>
              </Flex>
            )}
          </Flex>

          <Flex wrap="wrap" align="center" mb="md">
            <GameLevelBadge level={task.level} />
            <Title order={1} fz="h3" ml="md" c="white">
              {task.name}
            </Title>
          </Flex>

          <Flex wrap="wrap" align="center">
            <Badge color={levelBadgeColors[task.level] || 'gray'} mr="xs" mb={4}>
              {i18n.t(task.level)}
            </Badge>
            <Badge color={stateInfo.color} mr="xs" mb={4}>
              {i18n.t(stateInfo.label)}
            </Badge>
            {task.origin && (
              <Badge mr="xs" mb={4} style={{ backgroundColor: '#343a40', color: '#fff' }}>
                {task.origin}
              </Badge>
            )}
            {task.visibility && (
              <Badge color={task.visibility === 'public' ? 'green' : 'gray'} mr="xs" mb={4}>
                {i18n.t(task.visibility)}
              </Badge>
            )}
            {task.tags &&
              task.tags.map((tag) => (
                <Badge
                  key={tag}
                  mr="xs"
                  mb={4}
                  style={{ backgroundColor: '#343a40', color: '#fff' }}
                >
                  {tag}
                </Badge>
              ))}
          </Flex>
        </Box>
      </Box>

      <Box w="100%" maw={1140} mx="auto" px="md" py="lg">
        <Grid>
          {/* Main content */}
          <Grid.Col span={{ base: 12, lg: 8 }}>
            {/* Description */}
            <Paper withBorder radius="md" mb="md" className="cb-bg-panel">
              <Box p="md">
                <Flex justify="space-between" align="center" mb="md">
                  <Title order={5} c="white">
                    {i18n.t('Description')}
                  </Title>
                  <Flex align="center">
                    {hasRuDescription && (
                      <Button.Group mr="xs">
                        <Button
                          size="compact-sm"
                          variant={descLang === 'en' ? 'filled' : 'outline'}
                          color="cbSecondary"
                          onClick={() => {
                            setDescLang('en');
                            setEditingDesc(false);
                          }}
                        >
                          EN
                        </Button>
                        <Button
                          size="compact-sm"
                          variant={descLang === 'ru' ? 'filled' : 'outline'}
                          color="cbSecondary"
                          onClick={() => {
                            setDescLang('ru');
                            setEditingDesc(false);
                          }}
                        >
                          RU
                        </Button>
                      </Button.Group>
                    )}
                    {canEditTask && !editingDesc && (
                      <Button
                        size="compact-sm"
                        variant="outline"
                        color="cbSecondary"
                        radius="md"
                        onClick={startEditDesc}
                      >
                        {i18n.t('Edit')}
                      </Button>
                    )}
                  </Flex>
                </Flex>
                {editingDesc ? (
                  <div>
                    <Textarea
                      aria-label={i18n.t('Description')}
                      rows={12}
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      mb="xs"
                    />
                    <Flex justify="flex-end">
                      <Button
                        size="compact-sm"
                        variant="outline"
                        color="cbSecondary"
                        radius="md"
                        mr="xs"
                        onClick={() => setEditingDesc(false)}
                      >
                        {i18n.t('Cancel')}
                      </Button>
                      <Button
                        size="compact-sm"
                        color="cbSuccess"
                        radius="md"
                        onClick={saveDesc}
                        disabled={isSaving}
                      >
                        {i18n.t('Save')}
                      </Button>
                    </Flex>
                  </div>
                ) : (
                  <Box c="white">
                    <TaskDescriptionMarkdown description={description} />
                  </Box>
                )}
              </Box>
            </Paper>

            {/* Signature */}
            <Paper withBorder radius="md" mb="md" className="cb-bg-panel">
              <Box p="md">
                <Title order={5} c="white" mb="md">
                  {i18n.t('Function Signature')}
                </Title>
                <SignatureDisplay
                  inputSignature={task.inputSignature}
                  outputSignature={task.outputSignature}
                />
              </Box>
            </Paper>

            {/* Examples */}
            {task.assertsExamples && task.assertsExamples.length > 0 && (
              <Paper withBorder radius="md" mb="md" className="cb-bg-panel">
                <Box p="md">
                  <Title order={5} c="white" mb="md">
                    {i18n.t('Examples')}
                  </Title>
                  <ExamplesTable examples={task.assertsExamples} />
                </Box>
              </Paper>
            )}

            {/* All asserts */}
            {task.asserts && task.asserts.length > 0 && <AssertsSection asserts={task.asserts} />}

            {/* Stats */}
            {taskStats && (
              <Paper withBorder radius="md" mb="md" className="cb-bg-panel">
                <Box p="md">
                  <Title order={5} c="white" mb="md">
                    {i18n.t('Statistics')}
                  </Title>
                  <Flex gap={12} mb="md">
                    <StatCard label={i18n.t('Games')} value={taskStats.gamesCount} />
                    <StatCard label={i18n.t('Winners')} value={taskStats.winnersCount} />
                  </Flex>

                  <Text
                    className="cb-text"
                    size="xs"
                    tt="uppercase"
                    mt="md"
                    mb="md"
                    style={{ letterSpacing: 1 }}
                  >
                    {i18n.t('Solve Time (winners)')}
                  </Text>
                  <PercentileBar percentiles={taskStats.percentiles} />
                </Box>
              </Paper>
            )}

            {/* Leaderboard */}
            {taskStats && <Leaderboard entries={taskStats.leaderboard} />}
          </Grid.Col>

          {/* Sidebar */}
          <Grid.Col span={{ base: 12, lg: 4 }}>
            {/* Play button */}
            <Paper withBorder radius="md" mb="md" className="cb-bg-panel">
              <Box p="md">
                <Button
                  fullWidth
                  size="lg"
                  color="cbSuccess"
                  radius="md"
                  fw={700}
                  onClick={handlePlayTask}
                  disabled={isCreating || task.state !== 'active'}
                >
                  {isCreating ? (
                    <>
                      <Loader size="xs" mr="xs" />
                      {i18n.t('Creating game...')}
                    </>
                  ) : (
                    i18n.t('Play this task')
                  )}
                </Button>
                {task.state !== 'active' && (
                  <Text size="xs" ta="center" mt="xs" className="cb-text">
                    {i18n.t('Task must be active to play')}
                  </Text>
                )}
              </Box>
            </Paper>

            {/* Editable Details */}
            <Paper withBorder radius="md" mb="md" className="cb-bg-panel">
              <Box p="md">
                <Title order={5} c="white" mb="md">
                  {i18n.t('Details')}
                </Title>
                <Box component="dl" mb={0}>
                  <MetaRow label={i18n.t('ID')}>{task.id}</MetaRow>

                  <MetaRow label={i18n.t('Level')}>
                    {canEditTask ? (
                      <EditableSelect
                        value={task.level}
                        options={levelOptions}
                        onChange={(v) => updateField('level', v)}
                        disabled={isSaving}
                      />
                    ) : (
                      i18n.t(task.level)
                    )}
                  </MetaRow>

                  <MetaRow label={i18n.t('State')}>
                    {canEditTask ? (
                      <EditableSelect
                        value={task.state}
                        options={stateOptions}
                        onChange={(v) => updateField('state', v)}
                        disabled={isSaving}
                      />
                    ) : (
                      i18n.t(stateInfo.label)
                    )}
                  </MetaRow>

                  <MetaRow label={i18n.t('Visibility')}>
                    {canEditTask ? (
                      <EditableSelect
                        value={task.visibility}
                        options={visibilityOptions}
                        onChange={(v) => updateField('visibility', v)}
                        disabled={isSaving}
                      />
                    ) : task.visibility ? (
                      i18n.t(task.visibility)
                    ) : (
                      task.visibility
                    )}
                  </MetaRow>

                  <MetaRow label={i18n.t('Type')}>{i18n.t(task.type || 'algorithms')}</MetaRow>
                  <MetaRow label={i18n.t('Origin')}>{task.origin}</MetaRow>
                  {task.timeToSolveSec != null && (
                    <MetaRow label={i18n.t('Time to solve')}>
                      {formatDuration(task.timeToSolveSec)}
                    </MetaRow>
                  )}
                  {task.baseScore != null && (
                    <MetaRow label={i18n.t('Base static score')}>{task.baseScore}</MetaRow>
                  )}
                  {task.creatorId && (
                    <MetaRow label={i18n.t('Creator ID')}>{task.creatorId}</MetaRow>
                  )}
                  {task.insertedAt && (
                    <MetaRow label={i18n.t('Created')}>
                      {new Date(task.insertedAt).toLocaleDateString(i18n.language)}
                    </MetaRow>
                  )}
                  {task.updatedAt && (
                    <MetaRow label={i18n.t('Updated')}>
                      {new Date(task.updatedAt).toLocaleDateString(i18n.language)}
                    </MetaRow>
                  )}
                </Box>

                {canEditTask && (
                  <Box
                    mt="md"
                    pt="md"
                    style={{
                      borderTop: '1px solid var(--mantine-color-default-border)',
                    }}
                  >
                    <Text
                      component="label"
                      htmlFor="task-preview-tags-input"
                      className="cb-text"
                      size="xs"
                      mb={4}
                    >
                      {i18n.t('Tags')}
                    </Text>
                    <EditableTagsInput
                      inputId="task-preview-tags-input"
                      value={task.tags || []}
                      onChange={(v) => updateField('tags', v)}
                      disabled={isSaving}
                    />
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid.Col>
        </Grid>
      </Box>
    </Box>
  );
}

export default TaskPreviewWidget;
