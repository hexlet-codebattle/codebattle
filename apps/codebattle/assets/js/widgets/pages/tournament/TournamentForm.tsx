import React, { useState, useEffect, useCallback } from 'react';

import i18next from 'i18next';
import { useSelector } from 'react-redux';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Flex,
  Grid,
  Input,
  NativeSelect,
  NumberInput,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';

import { currentUserIsAdminSelector } from '@/selectors';

import { formatDatetimeLocal } from './dateTime';

const TASK_PROVIDERS = [
  { value: 'level', label: 'Level' },
  { value: 'task_pack', label: 'Task Pack' },
  { value: 'tags', label: 'Tags' },
];

const TASK_STRATEGIES = [
  { value: 'random', label: 'Random' },
  { value: 'sequential', label: 'Sequential' },
];

const ACCESS_TYPES = [
  { value: 'public', label: 'Public' },
  { value: 'token', label: 'Token (Private)' },
];

const LEVELS = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const SCORE_STRATEGIES = [
  { value: '75_percentile', label: '75 Percentile' },
  { value: 'static_base_score', label: 'Static Base Score' },
  { value: 'win_loss', label: 'Win/Loss' },
];

const TIMEOUT_MODES = [
  { value: 'per_task', label: 'Per task timeout' },
  { value: 'per_round_fixed', label: 'Per round (fixed)' },
  { value: 'per_round_with_rematch', label: 'Per round (with rematch)' },
  { value: 'per_tournament', label: 'Per tournament timeout' },
];

const TOURNAMENT_TYPES = [
  { value: 'swiss', label: 'Swiss' },
  { value: 'ladder', label: 'Ladder (continuous matchmaking)' },
];

const PLAYERS_LIMITS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];

// Fancy markdown template pre-filled into the Description field for new tournaments.
// The whole string is an i18next key; Russian lives in ru/LC_MESSAGES/default.po.
const DEFAULT_DESCRIPTION = `- ✅ Solve each task correctly to earn points
- ⚡ Faster solutions rank higher
- 🤝 Be respectful to other players

Good luck and have fun! 🚀`;

// Playful default tournament names. A random one is pre-filled for new tournaments.
// `phrase` is an i18next key (Russian in ru/LC_MESSAGES/default.po); the emoji is neutral.
const FUN_NAMES: { emoji: string; phrase: string }[] = [
  { emoji: '🔥', phrase: 'Code Rumble' },
  { emoji: '⚔️', phrase: 'Byte Brawl' },
  { emoji: '🏟️', phrase: 'Algo Arena Showdown' },
  { emoji: '🐛', phrase: 'The Great Bug Hunt' },
  { emoji: '💥', phrase: 'Syntax Smackdown' },
  { emoji: '🌙', phrase: 'Midnight Code Clash' },
  { emoji: '🚀', phrase: 'Turbo Loop Rumble' },
  { emoji: '⚡', phrase: 'Hack & Slash' },
  { emoji: '🌀', phrase: 'Recursion Rampage' },
  { emoji: '🎮', phrase: 'Stack Overflow Showdown' },
];

// Per-option explanations. Values are English strings used directly as i18next keys;
// Russian translations live in priv/gettext/ru/LC_MESSAGES/default.po.
const TYPE_DESCRIPTIONS: Record<string, string> = {
  swiss:
    'Players are paired each round against opponents with a similar score. Runs for a fixed number of rounds — good for balanced, bracket-style events.',
  ladder:
    'Continuous pool matchmaking. "Rounds Limit" is the number of matching rounds; "Round Timeout" is the matching interval. Timeout and score are fixed (per-task, static base score).',
};

const TASK_PROVIDER_DESCRIPTIONS: Record<string, string> = {
  level: 'Tasks are picked automatically from the chosen difficulty level.',
  task_pack: "Tasks come from a fixed task pack, played in the pack's order.",
  tags: 'Tasks are picked by the given tags and difficulty level.',
};

const TASK_STRATEGY_DESCRIPTIONS: Record<string, string> = {
  random: 'Each player gets tasks in a random order.',
  sequential: 'All players get tasks in the same fixed order.',
};

const SCORE_STRATEGY_DESCRIPTIONS: Record<string, string> = {
  '75_percentile':
    'Score is based on the 75th percentile of solve times — faster solutions score higher.',
  static_base_score: "Each task gives a fixed base score regardless of the player's solve time.",
  win_loss: 'Only the match result counts — a win or a loss, with no partial score.',
};

const ACCESS_TYPE_DESCRIPTIONS: Record<string, string> = {
  public: 'Anyone can find and join this tournament.',
  token: 'Only players who have the invite link can join.',
};

const TIMEOUT_DESCRIPTIONS: Record<string, string> = {
  per_task:
    "Each game uses the task's own time limit. Different tasks may have different timeouts.",
  per_round_fixed: 'All games in a round share a fixed timeout. One task per round.',
  per_round_with_rematch:
    'Each round has a fixed timeout. Players play multiple tasks (rematches) within the round until time runs out.',
  per_tournament:
    'One global timeout for the entire tournament. Games use the remaining tournament time. Tournament ends automatically when time expires.',
};

interface TournamentFormValues {
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
  tags: string;
  players_limit: number;
  rounds_limit: number;
  timeout_mode: string;
  round_timeout_seconds: number | null;
  tournament_timeout_seconds: number | null;
  break_duration_seconds: number;
  use_chat: boolean;
  ranking_type: string;
  score_strategy: string;
  meta_json: string;
}

type TournamentFormErrors = Partial<Record<string, string | string[]>> & {
  base?: string;
};

interface TournamentFormProps {
  initialValues?: Partial<TournamentFormValues>;
  onSubmit: (payload: Record<string, unknown>) => void;
  onValidate?: ((formData: TournamentFormValues) => void) | null;
  errors?: TournamentFormErrors;
  isSubmitting?: boolean;
  submitButtonText?: string;
  taskPackNames?: string[];
  userTimezone?: string;
  showCancelButton?: boolean;
  cancelButtonText?: string;
  onCancel?: (() => void) | null;
}

function FieldHelp({ text }: { text?: string }) {
  if (!text) {
    return null;
  }

  return (
    <Text
      component="small"
      display="block"
      mt="xs"
      c="dimmed"
      style={{ fontSize: '0.75rem', lineHeight: 1.35 }}
    >
      {text}
    </Text>
  );
}

function FieldLabel({
  htmlFor,
  active = true,
  children,
}: {
  htmlFor: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Input.Label htmlFor={htmlFor} fw={600} mb={4} size="xs" c={active ? undefined : 'dimmed'}>
      {children}
    </Input.Label>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section" mb="lg">
      <Text
        component="h6"
        tt="uppercase"
        fw={700}
        c="dimmed"
        mb="sm"
        pb="xs"
        style={{
          fontSize: '0.78rem',
          letterSpacing: '0.04em',
          borderBottom: '1px solid #4c4c5a',
        }}
      >
        {title}
      </Text>
      {children}
    </Box>
  );
}

function TournamentForm({
  initialValues = {},
  onSubmit,
  onValidate = null,
  errors = {},
  isSubmitting = false,
  submitButtonText = 'Create Tournament',
  taskPackNames = [],
  userTimezone = 'UTC',
  showCancelButton = false,
  cancelButtonText = 'Cancel',
  onCancel = null,
}: TournamentFormProps) {
  const [formData, setFormData] = useState<TournamentFormValues>(() => {
    const defaultStartsAt = formatDatetimeLocal(
      new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      userTimezone,
    );
    const funName = FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)];

    return {
      type: initialValues.type || 'ladder',
      name: initialValues.name || `${funName.emoji} ${i18next.t(funName.phrase)}`,
      description: initialValues.description || i18next.t(DEFAULT_DESCRIPTION),
      moderator_ids: initialValues.moderator_ids || '',
      starts_at: initialValues.starts_at || defaultStartsAt,
      access_type: initialValues.access_type || 'public',
      task_provider: initialValues.task_provider || 'level',
      task_strategy: initialValues.task_strategy || 'random',
      level: initialValues.level || 'easy',
      task_pack_name: initialValues.task_pack_name || '',
      tags: initialValues.tags || '',
      players_limit: initialValues.players_limit || 64,
      rounds_limit: initialValues.rounds_limit || 7,
      timeout_mode: initialValues.timeout_mode || 'per_task',
      round_timeout_seconds: initialValues.round_timeout_seconds ?? 60,
      tournament_timeout_seconds: initialValues.tournament_timeout_seconds ?? 3600,
      break_duration_seconds: initialValues.break_duration_seconds || 10,
      use_chat: initialValues.use_chat !== undefined ? initialValues.use_chat : true,
      ranking_type: initialValues.ranking_type || 'by_user',
      score_strategy: initialValues.score_strategy || '75_percentile',
      meta_json: initialValues.meta_json || '{}',
    };
  });

  useEffect(() => {
    if (onValidate) {
      onValidate(formData);
    }
  }, [formData, onValidate]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
        ...(name === 'type' && value === 'ladder'
          ? {
              timeout_mode: 'per_task',
              score_strategy: 'static_base_score',
              ranking_type: 'by_user',
            }
          : {}),
      }));
    },
    [],
  );

  const handleNumberChange = useCallback((name: string) => {
    return (value: number | string) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
    };
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const payload: Record<string, unknown> = { ...formData };
      payload.moderator_ids = formData.moderator_ids
        .split(/[\s,]+/)
        .map((id) => id.trim())
        .filter(Boolean);

      const isLadder = formData.type === 'ladder';

      if (isLadder) {
        // Ladder always scores by static task base score per user. Its timeout mode
        // controls whether ticks use task base_score (`per_task`) or fixed round time.
        payload.score_strategy = 'static_base_score';
        payload.ranking_type = 'by_user';
        payload.round_timeout_seconds = formData.round_timeout_seconds;
        payload.tournament_timeout_seconds = null;
      } else {
        payload.round_timeout_seconds = ['per_round_fixed', 'per_round_with_rematch'].includes(
          formData.timeout_mode,
        )
          ? formData.round_timeout_seconds
          : null;
        payload.tournament_timeout_seconds =
          formData.timeout_mode === 'per_tournament' ? formData.tournament_timeout_seconds : null;
      }

      onSubmit(payload);
    },
    [formData, onSubmit],
  );

  const errorText = (fieldName: string) => {
    const err = errors[fieldName];
    if (!err) {
      return undefined;
    }
    return Array.isArray(err) ? err.join(', ') : err;
  };

  const isLadder = formData.type === 'ladder';
  const roundTimeoutActive =
    isLadder || ['per_round_fixed', 'per_round_with_rematch'].includes(formData.timeout_mode);
  const tournamentTimeoutActive = !isLadder && formData.timeout_mode === 'per_tournament';
  const isAdmin = useSelector(currentUserIsAdminSelector);

  return (
    <Box component="form" onSubmit={handleSubmit} w="100%">
      {errors.base && (
        <Alert color="red" mb="lg" role="alert">
          {errors.base}
        </Alert>
      )}

      {/* Basic Information */}
      <FormSection title={i18next.t('Basic Information')}>
        <Grid gap="md">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <FieldLabel htmlFor="name">{i18next.t('Tournament Name')}</FieldLabel>
            <TextInput
              id="name"
              name="name"
              aria-label={i18next.t('Tournament Name')}
              error={errorText('name')}
              value={formData.name}
              onChange={handleChange}
              maxLength={42}
              required
            />
            <FieldHelp
              text={i18next.t('Shown to players in the lobby and on the tournament page.')}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <FieldLabel htmlFor="moderator_ids">{i18next.t('Moderator IDs')}</FieldLabel>
            <TextInput
              id="moderator_ids"
              name="moderator_ids"
              aria-label={i18next.t('Moderator IDs')}
              error={errorText('moderator_ids')}
              value={formData.moderator_ids}
              onChange={handleChange}
              placeholder="42, 1337"
            />
            <FieldHelp
              text={i18next.t(
                'Moderators can start and cancel the tournament, kick or ban players, and manage rounds. Enter user IDs separated by commas or spaces. You are always a moderator and do not need to be listed here.',
              )}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <FieldLabel htmlFor="description">{i18next.t('Description')}</FieldLabel>
            <Textarea
              id="description"
              name="description"
              aria-label={i18next.t('Description')}
              error={errorText('description')}
              value={formData.description}
              onChange={handleChange}
              rows={6}
              maxLength={7531}
              required
            />
            <FieldHelp text={i18next.t('Markdown is supported. Shown on the tournament page.')} />
          </Grid.Col>
        </Grid>
      </FormSection>

      {/* Schedule & Access */}
      <FormSection title={i18next.t('Schedule & Access')}>
        <Grid gap="md">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="starts_at">
              {i18next.t('Starts at')} ({userTimezone})
            </FieldLabel>
            <TextInput
              type="datetime-local"
              id="starts_at"
              name="starts_at"
              aria-label={i18next.t('Starts at')}
              error={errorText('starts_at')}
              value={formData.starts_at}
              onChange={handleChange}
              required
            />
            <FieldHelp
              text={i18next.t(
                'Approximate start time shown to players. The creator or a moderator starts the tournament manually.',
              )}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="access_type">{i18next.t('Access Type')}</FieldLabel>
            <NativeSelect
              id="access_type"
              name="access_type"
              error={errorText('access_type')}
              data={ACCESS_TYPES.map((type) => ({
                value: type.value,
                label: i18next.t(type.label),
              }))}
              value={formData.access_type}
              onChange={handleChange}
            />
            <FieldHelp text={i18next.t(ACCESS_TYPE_DESCRIPTIONS[formData.access_type])} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="use_chat">{i18next.t('Options')}</FieldLabel>
            <Checkbox
              id="use_chat"
              name="use_chat"
              aria-label={i18next.t('Use Chat')}
              label={i18next.t('Use Chat')}
              checked={formData.use_chat}
              onChange={handleChange}
              mt="xs"
            />
            <FieldHelp text={i18next.t('Show the in-tournament chat to participants.')} />
          </Grid.Col>
        </Grid>
      </FormSection>

      {/* Task Configuration */}
      <FormSection title={i18next.t('Task Configuration')}>
        <Grid gap="md">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="task_provider">{i18next.t('Task Provider')}</FieldLabel>
            <NativeSelect
              id="task_provider"
              name="task_provider"
              error={errorText('task_provider')}
              data={TASK_PROVIDERS.map((provider) => ({
                value: provider.value,
                label: i18next.t(provider.label),
              }))}
              value={formData.task_provider}
              onChange={handleChange}
            />
            <FieldHelp text={i18next.t(TASK_PROVIDER_DESCRIPTIONS[formData.task_provider])} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="task_strategy">{i18next.t('Task Strategy')}</FieldLabel>
            <NativeSelect
              id="task_strategy"
              name="task_strategy"
              error={errorText('task_strategy')}
              data={TASK_STRATEGIES.map((strategy) => ({
                value: strategy.value,
                label: i18next.t(strategy.label),
              }))}
              value={formData.task_strategy}
              onChange={handleChange}
            />
            <FieldHelp text={i18next.t(TASK_STRATEGY_DESCRIPTIONS[formData.task_strategy])} />
          </Grid.Col>

          {(formData.task_provider === 'level' || formData.task_provider === 'tags') && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <FieldLabel htmlFor="level">{i18next.t('Level')}</FieldLabel>
              <NativeSelect
                id="level"
                name="level"
                error={errorText('level')}
                data={LEVELS.map((level) => ({
                  value: level.value,
                  label: i18next.t(level.label),
                }))}
                value={formData.level}
                onChange={handleChange}
              />
            </Grid.Col>
          )}

          {formData.task_provider === 'task_pack' && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <FieldLabel htmlFor="task_pack_name">{i18next.t('Task Pack')}</FieldLabel>
              <NativeSelect
                id="task_pack_name"
                name="task_pack_name"
                error={errorText('task_pack_name')}
                data={[
                  { value: '', label: i18next.t('Select a task pack') },
                  ...taskPackNames.map((name) => ({
                    value: name,
                    label: name,
                  })),
                ]}
                value={formData.task_pack_name}
                onChange={handleChange}
              />
            </Grid.Col>
          )}

          {formData.task_provider === 'tags' && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <FieldLabel htmlFor="tags">{i18next.t('Tags (comma separated)')}</FieldLabel>
              <TextInput
                id="tags"
                name="tags"
                aria-label={i18next.t('Tags')}
                error={errorText('tags')}
                value={formData.tags}
                onChange={handleChange}
                placeholder="strings,math"
              />
            </Grid.Col>
          )}
        </Grid>
      </FormSection>

      {/* Tournament Settings */}
      <FormSection title={i18next.t('Tournament Settings')}>
        <Grid gap="md">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="type">{i18next.t('Tournament Type')}</FieldLabel>
            <NativeSelect
              id="type"
              name="type"
              error={errorText('type')}
              data={TOURNAMENT_TYPES.map((type) => ({
                value: type.value,
                label: i18next.t(type.label),
              }))}
              value={formData.type}
              onChange={handleChange}
            />
            <FieldHelp text={i18next.t(TYPE_DESCRIPTIONS[formData.type])} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="players_limit">{i18next.t('Players Limit')}</FieldLabel>
            <NativeSelect
              id="players_limit"
              name="players_limit"
              error={errorText('players_limit')}
              data={PLAYERS_LIMITS.map((limit) => ({
                value: String(limit),
                label: String(limit),
              }))}
              value={formData.players_limit}
              onChange={handleChange}
            />
            <FieldHelp text={i18next.t('Maximum number of players who can join.')} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="score_strategy">{i18next.t('Score Strategy')}</FieldLabel>
            <NativeSelect
              id="score_strategy"
              name="score_strategy"
              error={errorText('score_strategy')}
              data={SCORE_STRATEGIES.map((strategy) => ({
                value: strategy.value,
                label: i18next.t(strategy.label),
              }))}
              value={formData.score_strategy}
              onChange={handleChange}
              disabled={isLadder}
            />
            <FieldHelp
              text={
                isLadder
                  ? i18next.t('Ladder always uses a static base score per task.')
                  : i18next.t(SCORE_STRATEGY_DESCRIPTIONS[formData.score_strategy])
              }
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="rounds_limit">{i18next.t('Rounds Limit')}</FieldLabel>
            <NativeSelect
              id="rounds_limit"
              name="rounds_limit"
              error={errorText('rounds_limit')}
              data={Array.from({ length: 42 }, (_, i) => i + 1).map((num) => ({
                value: String(num),
                label: String(num),
              }))}
              value={formData.rounds_limit}
              onChange={handleChange}
            />
            <FieldHelp
              text={
                isLadder
                  ? i18next.t('For Ladder, this is the number of matching rounds.')
                  : i18next.t('Number of rounds to play.')
              }
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="break_duration_seconds">
              {i18next.t('Break Duration (seconds)')}
            </FieldLabel>
            <NumberInput
              id="break_duration_seconds"
              name="break_duration_seconds"
              aria-label={i18next.t('Break Duration (seconds)')}
              error={errorText('break_duration_seconds')}
              value={formData.break_duration_seconds}
              onChange={handleNumberChange('break_duration_seconds')}
              min={0}
              max={100000}
            />
            <FieldHelp text={i18next.t('Pause between rounds, in seconds.')} />
          </Grid.Col>
        </Grid>
      </FormSection>

      {/* Timeout Configuration */}
      <FormSection title={i18next.t('Timeout Configuration')}>
        <Grid gap="md">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="timeout_mode" active={!isLadder}>
              {i18next.t('Timeout Mode')}
            </FieldLabel>
            <NativeSelect
              id="timeout_mode"
              name="timeout_mode"
              data={TIMEOUT_MODES.map((mode) => ({
                value: mode.value,
                label: i18next.t(mode.label),
              }))}
              value={formData.timeout_mode}
              onChange={handleChange}
              disabled={isLadder}
            />
            <FieldHelp text={i18next.t(TIMEOUT_DESCRIPTIONS[formData.timeout_mode])} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="round_timeout_seconds" active={roundTimeoutActive}>
              {isLadder
                ? i18next.t('Matching interval (sec)')
                : i18next.t('Round Timeout (seconds)')}
            </FieldLabel>
            <NumberInput
              id="round_timeout_seconds"
              name="round_timeout_seconds"
              aria-label={i18next.t('Round Timeout (seconds)')}
              error={errorText('round_timeout_seconds')}
              value={roundTimeoutActive ? (formData.round_timeout_seconds ?? '') : ''}
              onChange={handleNumberChange('round_timeout_seconds')}
              min={isLadder ? 1 : 10}
              max={10000}
              disabled={!roundTimeoutActive}
            />
            <FieldHelp
              text={
                isLadder
                  ? i18next.t('How often the pool is matched, in seconds.')
                  : i18next.t('Time limit for each round, in seconds.')
              }
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <FieldLabel htmlFor="tournament_timeout_seconds" active={tournamentTimeoutActive}>
              {i18next.t('Tournament Timeout (seconds)')}
            </FieldLabel>
            <NumberInput
              id="tournament_timeout_seconds"
              name="tournament_timeout_seconds"
              aria-label={i18next.t('Tournament Timeout (seconds)')}
              error={errorText('tournament_timeout_seconds')}
              value={tournamentTimeoutActive ? (formData.tournament_timeout_seconds ?? '') : ''}
              onChange={handleNumberChange('tournament_timeout_seconds')}
              min={60}
              max={36000}
              disabled={!tournamentTimeoutActive}
            />
            <FieldHelp text={i18next.t('Total time for the whole tournament, in seconds.')} />
          </Grid.Col>
        </Grid>
      </FormSection>

      {/* Advanced Settings (admins only) */}
      {isAdmin && (
        <FormSection title={i18next.t('Advanced Settings')}>
          <Grid gap="md">
            <Grid.Col span={12}>
              <FieldLabel htmlFor="meta_json">{i18next.t('Meta JSON')}</FieldLabel>
              <Textarea
                id="meta_json"
                name="meta_json"
                aria-label={i18next.t('Meta JSON')}
                error={errorText('meta_json')}
                value={formData.meta_json}
                onChange={handleChange}
                rows={3}
              />
              <FieldHelp text={i18next.t('Advanced JSON configuration. Leave as {} if unsure.')} />
            </Grid.Col>
          </Grid>
        </FormSection>
      )}

      {/* Action Buttons */}
      <Flex justify="space-between" align="center" mt="lg">
        {showCancelButton && (
          <Button
            type="button"
            variant="outline"
            color="cbSecondary"
            radius="md"
            onClick={onCancel ?? undefined}
            disabled={isSubmitting}
          >
            {i18next.t(cancelButtonText)}
          </Button>
        )}
        <Button type="submit" color="cbSecondary" radius="md" px="xl" disabled={isSubmitting}>
          {isSubmitting ? i18next.t('Submitting...') : i18next.t(submitButtonText)}
        </Button>
      </Flex>
    </Box>
  );
}

export default TournamentForm;
export type { TournamentFormValues };
