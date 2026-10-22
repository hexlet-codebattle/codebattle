import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowLeft,
  IconDeviceFloppy,
  IconDice5,
  IconHistory,
  IconRocket,
  IconUsers,
} from '@tabler/icons-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatStartsIn, levelLabel, LEVELS, parseUtc, taskLevelsLabel } from '@/features/lobby/format';
import { t as translate } from '@/i18n';
import { Markdown } from '@/shared/Markdown';
import { useNow } from '@/shared/useNow';
import { useSharedProps } from '@/shared/useSharedProps';

import {
  ACCESS_TYPE_DESCRIPTIONS,
  ACCESS_TYPES,
  browserTimezone,
  DEFAULT_DESCRIPTION,
  FUN_NAMES,
  type LastTournament,
  PLAYERS_LIMITS,
  SCORE_STRATEGIES,
  SCORE_STRATEGY_DESCRIPTIONS,
  TASK_PROVIDER_DESCRIPTIONS,
  TASK_PROVIDERS,
  TASK_STRATEGIES,
  TASK_STRATEGY_DESCRIPTIONS,
  TIMEOUT_DESCRIPTIONS,
  TIMEOUT_MODES,
  toLocalInput,
  TOURNAMENT_TYPES,
  TYPE_DESCRIPTIONS,
} from './options';

interface Values {
  type: string;
  name: string;
  description: string;
  moderator_ids: string;
  starts_at: string;
  access_type: string;
  task_provider: string;
  task_strategy: string;
  level: string;
  task_pack_name: string;
  tags: string[];
  players_limit: string;
  rounds_limit: number;
  timeout_mode: string;
  round_timeout_seconds: number;
  tournament_timeout_seconds: number;
  break_duration_seconds: number;
  use_chat: boolean;
  ranking_type: string;
  score_strategy: string;
  meta_json: string;
}

const funName = () => {
  const pick = FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)];
  return `${pick.emoji} ${translate(pick.phrase)}`;
};

const inMinutes = (minutes: number) => toLocalInput(new Date(Date.now() + minutes * 60_000));

function defaults(last?: LastTournament | null, editing?: EditableTournament | null): Values {
  return {
    type: last?.type || 'ladder',
    name: last?.name || funName(),
    description: last?.description || translate(DEFAULT_DESCRIPTION),
    moderator_ids: (last?.moderator_ids ?? []).join(', '),
    starts_at: editing?.starts_at ? toLocalInput(parseUtc(editing.starts_at)) : inMinutes(5),
    access_type: last?.access_type || 'public',
    task_provider: last?.task_provider || 'level',
    task_strategy: last?.task_strategy || 'random',
    level: last?.level || 'easy',
    task_pack_name: last?.task_pack_name || '',
    tags: [],
    players_limit: String(last?.players_limit || 64),
    rounds_limit: last?.rounds_limit || 7,
    timeout_mode: last?.timeout_mode || 'per_task',
    round_timeout_seconds: last?.round_timeout_seconds ?? 60,
    tournament_timeout_seconds: last?.tournament_timeout_seconds ?? 3600,
    break_duration_seconds: last?.break_duration_seconds ?? 10,
    use_chat: last?.use_chat ?? true,
    ranking_type: last?.ranking_type || 'by_user',
    score_strategy: last?.score_strategy || '75_percentile',
    meta_json: last?.meta && Object.keys(last.meta).length > 0 ? JSON.stringify(last.meta, null, 2) : '{}',
  };
}

const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

type Errors = Record<string, string>;

function flattenErrors(errors: Record<string, unknown>): Errors {
  return Object.fromEntries(
    Object.entries(errors).map(([field, value]) => [field, Array.isArray(value) ? value.join(', ') : String(value)]),
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card padding="lg">
      <Text fz="xs" fw={700} c="dimmed" tt="uppercase" lts="0.06em" mb="md">
        {title}
      </Text>
      {children}
    </Card>
  );
}

/** Segmented choice with the selected option's explanation underneath. */
function Choice({
  label,
  value,
  onChange,
  data,
  help,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  data: { value: string; label: string }[];
  help?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <SegmentedControl
        fullWidth
        value={value}
        onChange={onChange}
        disabled={disabled}
        data={data.map((option) => ({ value: option.value, label: t(option.label) }))}
      />
      {help && (
        <Text size="xs" c="dimmed">
          {t(help)}
        </Text>
      )}
    </Stack>
  );
}

/** TournamentController.edit `tournament`: the editable settings plus identity. */
export interface EditableTournament extends LastTournament {
  id: number;
  state: string;
  starts_at: string | null;
  creator: { id: number; name: string } | null;
}

interface TournamentFormProps {
  taskPackNames: string[];
  /** Create mode: offered as "Use last settings". */
  lastTournament?: LastTournament | null;
  /** Edit mode: the tournament being changed. */
  editing?: EditableTournament | null;
}

/**
 * Create (POST /api/v1/tournaments, then open the new tournament) or edit
 * (PATCH /api/v1/tournaments/:id, stay on the form) a tournament.
 */
export function TournamentForm({ lastTournament = null, taskPackNames, editing = null }: TournamentFormProps) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const isAdmin = Boolean(me.is_admin);
  const [values, setValues] = useState<Values>(() => defaults(editing, editing));
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [descriptionTab, setDescriptionTab] = useState<string | null>('write');
  const now = useNow(30_000);
  const [timezone] = useState(browserTimezone);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      // Ladder runs per-task timeouts with a static base score, ranked by user.
      if (key === 'type' && value === 'ladder') {
        Object.assign(next, { timeout_mode: 'per_task', score_strategy: 'static_base_score', ranking_type: 'by_user' });
      }
      return next;
    });
    setErrors(({ [key]: _stale, ...rest }) => rest);
  };

  const isLadder = values.type === 'ladder';
  const roundTimeoutActive = isLadder || ['per_round_fixed', 'per_round_with_rematch'].includes(values.timeout_mode);
  const tournamentTimeoutActive = !isLadder && values.timeout_mode === 'per_tournament';
  const startsIn = new Date(values.starts_at).getTime() - now;

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    // The server parses meta_json (admins only); catch typos before sending.
    if (isAdmin) {
      try {
        JSON.parse(values.meta_json || '{}');
      } catch {
        setErrors({ meta_json: t('Invalid JSON') });
        return;
      }
    }

    const tournament: Record<string, unknown> = {
      ...values,
      tags: values.tags.join(','),
      players_limit: Number(values.players_limit),
      moderator_ids: values.moderator_ids.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean),
      round_timeout_seconds: roundTimeoutActive ? values.round_timeout_seconds : null,
      tournament_timeout_seconds: tournamentTimeoutActive ? values.tournament_timeout_seconds : null,
      user_timezone: timezone,
      ...(isLadder ? { score_strategy: 'static_base_score', ranking_type: 'by_user' } : {}),
    };

    setSubmitting(true);
    setErrors({});
    try {
      const response = await fetch(editing ? `/api/v1/tournaments/${editing.id}` : '/api/v1/tournaments', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ tournament }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fallback = editing ? t('Failed to update tournament') : t('An error occurred while creating the tournament');
        setErrors(data.errors ? flattenErrors(data.errors) : { base: data.error ?? fallback });
        setSubmitting(false);
        return;
      }
      if (editing) {
        notifications.show({ color: 'green', message: t('Tournament updated successfully') });
        setSubmitting(false);
        return;
      }
      window.location.assign(`/tournaments/${data.tournament.id}`);
    } catch {
      setErrors({ base: t('Network error. Please try again.') });
      setSubmitting(false);
    }
  };

  const errorFields = Object.keys(errors).filter((field) => field !== 'base');

  return (
    <form onSubmit={submit}>
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            {(errors.base || errorFields.length > 0) && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                {errors.base ?? t('Please fix the highlighted fields: %{fields}', { fields: errorFields.join(', ') })}
              </Alert>
            )}

            <FormSection title={t('Basic Information')}>
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    label={t('Tournament Name')}
                    description={t('Shown to players in the lobby and on the tournament page.')}
                    value={values.name}
                    onChange={(event) => set('name', event.currentTarget.value)}
                    error={errors.name}
                    maxLength={42}
                    required
                    rightSection={
                      <Tooltip label={t('Random name')}>
                        <ActionIcon variant="subtle" onClick={() => set('name', funName())} aria-label={t('Random name')}>
                          <IconDice5 size={16} />
                        </ActionIcon>
                      </Tooltip>
                    }
                  />
                  <TextInput
                    label={t('Moderator IDs')}
                    description={t('User IDs separated by commas. You are always a moderator.')}
                    placeholder="42, 1337"
                    value={values.moderator_ids}
                    onChange={(event) => set('moderator_ids', event.currentTarget.value)}
                    error={errors.moderator_ids}
                  />
                </SimpleGrid>
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      {t('Description')}
                    </Text>
                    <Tabs value={descriptionTab} onChange={setDescriptionTab} variant="pills">
                      <Tabs.List>
                        <Tabs.Tab value="write">
                          {t('Write')}
                        </Tabs.Tab>
                        <Tabs.Tab value="preview">{t('Preview')}</Tabs.Tab>
                      </Tabs.List>
                    </Tabs>
                  </Group>
                  {descriptionTab === 'preview' ? (
                    <Card withBorder padding="sm" mih={150}>
                      <Markdown>{values.description || '_…_'}</Markdown>
                    </Card>
                  ) : (
                    <Textarea
                      autosize
                      minRows={6}
                      maxRows={16}
                      value={values.description}
                      onChange={(event) => set('description', event.currentTarget.value)}
                      error={errors.description}
                      maxLength={7531}
                      required
                      styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13 } }}
                    />
                  )}
                  <Text size="xs" c="dimmed">
                    {t('Markdown is supported. Shown on the tournament page.')}
                  </Text>
                </Stack>
              </Stack>
            </FormSection>

            <FormSection title={t('Schedule & Access')}>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                <Stack gap={6}>
                  <TextInput
                    type="datetime-local"
                    label={`${t('Starts at')} (${timezone})`}
                    value={values.starts_at}
                    onChange={(event) => set('starts_at', event.currentTarget.value)}
                    error={errors.starts_at}
                    required
                  />
                  <Group gap={4}>
                    {[
                      [5, t('in 5 min')],
                      [30, t('in 30 min')],
                      [60, t('in 1 hour')],
                    ].map(([minutes, label]) => (
                      <Button key={minutes} size="compact-xs" variant="default" onClick={() => set('starts_at', inMinutes(minutes as number))}>
                        {label}
                      </Button>
                    ))}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t('Approximate start time shown to players. The creator or a moderator starts the tournament manually.')}
                  </Text>
                </Stack>
                <Stack gap="md">
                  <Choice
                    label={t('Access Type')}
                    value={values.access_type}
                    onChange={(value) => set('access_type', value)}
                    data={ACCESS_TYPES}
                    help={ACCESS_TYPE_DESCRIPTIONS[values.access_type]}
                  />
                  <Switch
                    label={t('Use Chat')}
                    description={t('Show the in-tournament chat to participants.')}
                    checked={values.use_chat}
                    onChange={(event) => set('use_chat', event.currentTarget.checked)}
                  />
                </Stack>
              </SimpleGrid>
            </FormSection>

            <FormSection title={t('Task Configuration')}>
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <Choice
                    label={t('Task Provider')}
                    value={values.task_provider}
                    onChange={(value) => set('task_provider', value)}
                    // Tag selection is an admin-only field on the server.
                    data={TASK_PROVIDERS.filter((provider) => provider.value !== 'tags' || isAdmin)}
                    help={TASK_PROVIDER_DESCRIPTIONS[values.task_provider]}
                  />
                  <Choice
                    label={t('Task Strategy')}
                    value={values.task_strategy}
                    onChange={(value) => set('task_strategy', value)}
                    data={TASK_STRATEGIES}
                    help={TASK_STRATEGY_DESCRIPTIONS[values.task_strategy]}
                  />
                </SimpleGrid>
                {values.task_provider === 'task_pack' ? (
                  <Select
                    label={t('Task Pack')}
                    placeholder={t('Select a task pack')}
                    data={taskPackNames}
                    value={values.task_pack_name || null}
                    onChange={(value) => set('task_pack_name', value ?? '')}
                    error={errors.task_pack_name}
                    searchable
                    nothingFoundMessage={t('No task packs')}
                    required
                  />
                ) : (
                  <Stack gap={4}>
                    <Text size="sm" fw={500}>
                      {values.task_provider === 'level_progression' ? t('Hardest level') : t('Level')}
                    </Text>
                    <SegmentedControl
                      fullWidth
                      value={values.level}
                      onChange={(value) => set('level', value)}
                      data={LEVELS.map((level) => ({ value: level, label: levelLabel(level) }))}
                    />
                  </Stack>
                )}
                {values.task_provider === 'tags' && (
                  <TagsInput
                    label={t('Tags')}
                    placeholder="strings, math"
                    value={values.tags}
                    onChange={(tags) => set('tags', tags)}
                    error={errors.tags}
                    splitChars={[',', ' ']}
                  />
                )}
              </Stack>
            </FormSection>

            <FormSection title={t('Tournament Settings')}>
              <Stack gap="md">
                <Choice
                  label={t('Tournament Type')}
                  value={values.type}
                  onChange={(value) => set('type', value)}
                  data={TOURNAMENT_TYPES}
                  help={TYPE_DESCRIPTIONS[values.type]}
                />
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Select
                    label={t('Players Limit')}
                    description={t('Maximum number of players who can join.')}
                    data={PLAYERS_LIMITS.map(String)}
                    value={values.players_limit}
                    onChange={(value) => value && set('players_limit', value)}
                    error={errors.players_limit}
                    allowDeselect={false}
                  />
                  <NumberInput
                    label={t('Rounds Limit')}
                    description={isLadder ? t('For Ladder, this is the number of matching rounds.') : t('Number of rounds to play.')}
                    min={1}
                    max={42}
                    value={values.rounds_limit}
                    onChange={(value) => set('rounds_limit', Number(value) || 1)}
                    error={errors.rounds_limit}
                  />
                  <NumberInput
                    label={t('Break Duration (seconds)')}
                    description={t('Pause between rounds, in seconds.')}
                    min={0}
                    max={100000}
                    value={values.break_duration_seconds}
                    onChange={(value) => set('break_duration_seconds', Number(value) || 0)}
                    error={errors.break_duration_seconds}
                  />
                </SimpleGrid>
                <Select
                  label={t('Score Strategy')}
                  description={
                    isLadder
                      ? t('Ladder always uses a static base score per task.')
                      : t(SCORE_STRATEGY_DESCRIPTIONS[values.score_strategy])
                  }
                  data={SCORE_STRATEGIES.map((option) => ({ value: option.value, label: t(option.label) }))}
                  value={values.score_strategy}
                  onChange={(value) => value && set('score_strategy', value)}
                  disabled={isLadder}
                  allowDeselect={false}
                />
              </Stack>
            </FormSection>

            <FormSection title={t('Timeout Configuration')}>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Select
                  label={t('Timeout Mode')}
                  description={t(TIMEOUT_DESCRIPTIONS[values.timeout_mode])}
                  data={TIMEOUT_MODES.map((option) => ({ value: option.value, label: t(option.label) }))}
                  value={values.timeout_mode}
                  onChange={(value) => value && set('timeout_mode', value)}
                  disabled={isLadder}
                  allowDeselect={false}
                />
                <NumberInput
                  label={isLadder ? t('Matching interval (sec)') : t('Round Timeout (seconds)')}
                  description={
                    isLadder ? t('How often the pool is matched, in seconds.') : t('Time limit for each round, in seconds.')
                  }
                  min={isLadder ? 1 : 10}
                  max={10000}
                  value={roundTimeoutActive ? values.round_timeout_seconds : ''}
                  onChange={(value) => set('round_timeout_seconds', Number(value) || 0)}
                  disabled={!roundTimeoutActive}
                  error={errors.round_timeout_seconds}
                />
                <NumberInput
                  label={t('Tournament Timeout (seconds)')}
                  description={t('Total time for the whole tournament, in seconds.')}
                  min={60}
                  max={36000}
                  value={tournamentTimeoutActive ? values.tournament_timeout_seconds : ''}
                  onChange={(value) => set('tournament_timeout_seconds', Number(value) || 0)}
                  disabled={!tournamentTimeoutActive}
                  error={errors.tournament_timeout_seconds}
                />
              </SimpleGrid>
            </FormSection>

            {isAdmin && (
              <FormSection title={t('Advanced Settings')}>
                <Textarea
                  label={t('Meta JSON')}
                  description={t('Advanced JSON configuration. Leave as {} if unsure.')}
                  autosize
                  minRows={3}
                  value={values.meta_json}
                  onChange={(event) => set('meta_json', event.currentTarget.value)}
                  error={errors.meta_json}
                  styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13 } }}
                />
              </FormSection>
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card padding="lg" style={{ position: 'sticky', top: 'calc(56px + var(--mantine-spacing-md))' }}>
            <Stack gap="md">
              <Title order={4}>{t('Summary')}</Title>
              <Stack gap={2}>
                <Text fw={700} fz="lg" c="bright" lineClamp={2}>
                  {values.name || '—'}
                </Text>
                <Group gap={6}>
                  <Badge variant="default" tt="none">
                    {t(TOURNAMENT_TYPES.find((option) => option.value === values.type)?.label ?? values.type)}
                  </Badge>
                  <Badge variant="light" color={values.access_type === 'token' ? 'yellow' : 'gray'} tt="none">
                    {t(ACCESS_TYPES.find((option) => option.value === values.access_type)?.label ?? '')}
                  </Badge>
                </Group>
              </Stack>
              <SimpleGrid cols={2} spacing="sm">
                <SummaryFact label={t('Starts')} value={Number.isNaN(startsIn) ? '—' : startsIn <= 0 ? t('now') : formatStartsIn(startsIn)} />
                <SummaryFact
                  label={t('Players')}
                  value={
                    <Group gap={4} wrap="nowrap">
                      <IconUsers size={14} />
                      {values.players_limit}
                    </Group>
                  }
                />
                <SummaryFact label={t('Rounds')} value={values.rounds_limit} />
                <SummaryFact
                  label={t('Tasks')}
                  value={
                    values.task_provider === 'task_pack'
                      ? values.task_pack_name || '—'
                      : taskLevelsLabel(values.task_provider, values.level as (typeof LEVELS)[number])
                  }
                />
              </SimpleGrid>
              <Button
                type="submit"
                variant="filled"
                size="md"
                fullWidth
                loading={submitting}
                leftSection={editing ? <IconDeviceFloppy size={18} /> : <IconRocket size={18} />}
              >
                {editing ? t('Update Tournament') : t('Create Tournament')}
              </Button>
              {editing && (
                <Button
                  component="a"
                  href={`/tournaments/${editing.id}`}
                  variant="default"
                  fullWidth
                  leftSection={<IconArrowLeft size={16} />}
                >
                  {t('Back to tournament')}
                </Button>
              )}
              {!editing && lastTournament && (
                <Group gap="xs" grow>
                  <Button
                    size="xs"
                    variant="default"
                    leftSection={<IconHistory size={14} />}
                    onClick={() => {
                      setValues(defaults(lastTournament));
                      setErrors({});
                    }}
                  >
                    {t('Use last settings')}
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconArrowBackUp size={14} />}
                    onClick={() => {
                      setValues(defaults());
                      setErrors({});
                    }}
                  >
                    {t('Reset to defaults')}
                  </Button>
                </Group>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </form>
  );
}

function SummaryFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600} c="bright" component="div" truncate>
        {value}
      </Text>
    </Stack>
  );
}

/** The create tab of /tournaments. */
export function CreateTournament({ lastTournament, taskPackNames }: { lastTournament: LastTournament | null; taskPackNames: string[] }) {
  return <TournamentForm lastTournament={lastTournament} taskPackNames={taskPackNames} />;
}
