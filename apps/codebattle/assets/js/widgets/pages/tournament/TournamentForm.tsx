import React, { useState, useEffect, useCallback } from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

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

const INPUT_CLASS =
  'form-control form-control-sm cb-bg-panel cb-border-color text-white cb-rounded';
const SELECT_CLASS =
  'form-select form-select-sm custom-select cb-bg-panel cb-border-color text-white cb-rounded';

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

type TournamentFormErrors = Partial<Record<string, string | string[]>> & { base?: string };

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
    <small className="d-block mt-1 text-muted" style={{ fontSize: '0.75rem', lineHeight: 1.35 }}>
      {text}
    </small>
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
    <label
      htmlFor={htmlFor}
      className={cn('form-label small fw-semibold mb-1', active ? 'text-white' : 'text-muted')}
    >
      {children}
    </label>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h6
        className="text-uppercase fw-bold text-muted mb-3 pb-2 border-bottom cb-border-color"
        style={{ fontSize: '0.78rem', letterSpacing: '0.04em' }}
      >
        {title}
      </h6>
      {children}
    </section>
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

  const renderError = (fieldName: string) => {
    if (errors[fieldName]) {
      return (
        <div className="invalid-feedback d-block">
          {Array.isArray(errors[fieldName]) ? errors[fieldName].join(', ') : errors[fieldName]}
        </div>
      );
    }
    return null;
  };

  const isLadder = formData.type === 'ladder';
  const roundTimeoutActive =
    isLadder || ['per_round_fixed', 'per_round_with_rematch'].includes(formData.timeout_mode);
  const tournamentTimeoutActive = !isLadder && formData.timeout_mode === 'per_tournament';
  const isAdmin = useSelector(currentUserIsAdminSelector);

  return (
    <form onSubmit={handleSubmit} className="w-100">
      {errors.base && (
        <div className="alert alert-danger mb-4" role="alert">
          {errors.base}
        </div>
      )}

      {/* Basic Information */}
      <FormSection title={i18next.t('Basic Information')}>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <FieldLabel htmlFor="name">{i18next.t('Tournament Name')}</FieldLabel>
            <input
              type="text"
              id="name"
              name="name"
              aria-label="Tournament Name"
              className={cn(INPUT_CLASS, { 'is-invalid': errors.name })}
              value={formData.name}
              onChange={handleChange}
              maxLength={42}
              required
            />
            <FieldHelp
              text={i18next.t('Shown to players in the lobby and on the tournament page.')}
            />
            {renderError('name')}
          </div>

          <div className="col-12 col-md-6">
            <FieldLabel htmlFor="moderator_ids">{i18next.t('Moderator IDs')}</FieldLabel>
            <input
              type="text"
              id="moderator_ids"
              name="moderator_ids"
              aria-label="Moderator IDs"
              className={cn(INPUT_CLASS, { 'is-invalid': errors.moderator_ids })}
              value={formData.moderator_ids}
              onChange={handleChange}
              placeholder="42, 1337"
            />
            <FieldHelp
              text={i18next.t(
                'Moderators can start and cancel the tournament, kick or ban players, and manage rounds. Enter user IDs separated by commas or spaces. You are always a moderator and do not need to be listed here.',
              )}
            />
            {renderError('moderator_ids')}
          </div>

          <div className="col-12">
            <FieldLabel htmlFor="description">{i18next.t('Description')}</FieldLabel>
            <textarea
              id="description"
              name="description"
              aria-label="Description"
              className={cn(INPUT_CLASS, { 'is-invalid': errors.description })}
              value={formData.description}
              onChange={handleChange}
              rows={6}
              maxLength={7531}
              required
            />
            <FieldHelp text={i18next.t('Markdown is supported. Shown on the tournament page.')} />
            {renderError('description')}
          </div>
        </div>
      </FormSection>

      {/* Schedule & Access */}
      <FormSection title={i18next.t('Schedule & Access')}>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="starts_at">
              {i18next.t('Starts at')} ({userTimezone})
            </FieldLabel>
            <input
              type="datetime-local"
              id="starts_at"
              name="starts_at"
              aria-label="Starts at"
              className={cn(INPUT_CLASS, { 'is-invalid': errors.starts_at })}
              value={formData.starts_at}
              onChange={handleChange}
              required
            />
            <FieldHelp
              text={i18next.t(
                'Approximate start time shown to players. The creator or a moderator starts the tournament manually.',
              )}
            />
            {renderError('starts_at')}
          </div>

          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="access_type">{i18next.t('Access Type')}</FieldLabel>
            <select
              id="access_type"
              name="access_type"
              className={cn(SELECT_CLASS, { 'is-invalid': errors.access_type })}
              value={formData.access_type}
              onChange={handleChange}
            >
              {ACCESS_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {i18next.t(type.label)}
                </option>
              ))}
            </select>
            <FieldHelp text={i18next.t(ACCESS_TYPE_DESCRIPTIONS[formData.access_type])} />
            {renderError('access_type')}
          </div>

          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="use_chat">{i18next.t('Options')}</FieldLabel>
            <div className="form-check mt-1">
              <input
                type="checkbox"
                id="use_chat"
                name="use_chat"
                aria-label="Use Chat"
                className="form-check-input"
                checked={formData.use_chat}
                onChange={handleChange}
              />
              <label htmlFor="use_chat" className="form-check-label text-white">
                {i18next.t('Use Chat')}
              </label>
            </div>
            <FieldHelp text={i18next.t('Show the in-tournament chat to participants.')} />
          </div>
        </div>
      </FormSection>

      {/* Task Configuration */}
      <FormSection title={i18next.t('Task Configuration')}>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="task_provider">{i18next.t('Task Provider')}</FieldLabel>
            <select
              id="task_provider"
              name="task_provider"
              className={cn(SELECT_CLASS, { 'is-invalid': errors.task_provider })}
              value={formData.task_provider}
              onChange={handleChange}
            >
              {TASK_PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {i18next.t(provider.label)}
                </option>
              ))}
            </select>
            <FieldHelp text={i18next.t(TASK_PROVIDER_DESCRIPTIONS[formData.task_provider])} />
            {renderError('task_provider')}
          </div>

          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="task_strategy">{i18next.t('Task Strategy')}</FieldLabel>
            <select
              id="task_strategy"
              name="task_strategy"
              className={cn(SELECT_CLASS, { 'is-invalid': errors.task_strategy })}
              value={formData.task_strategy}
              onChange={handleChange}
            >
              {TASK_STRATEGIES.map((strategy) => (
                <option key={strategy.value} value={strategy.value}>
                  {i18next.t(strategy.label)}
                </option>
              ))}
            </select>
            <FieldHelp text={i18next.t(TASK_STRATEGY_DESCRIPTIONS[formData.task_strategy])} />
            {renderError('task_strategy')}
          </div>

          {(formData.task_provider === 'level' || formData.task_provider === 'tags') && (
            <div className="col-12 col-md-4">
              <FieldLabel htmlFor="level">{i18next.t('Level')}</FieldLabel>
              <select
                id="level"
                name="level"
                className={cn(SELECT_CLASS, { 'is-invalid': errors.level })}
                value={formData.level}
                onChange={handleChange}
              >
                {LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {i18next.t(level.label)}
                  </option>
                ))}
              </select>
              {renderError('level')}
            </div>
          )}

          {formData.task_provider === 'task_pack' && (
            <div className="col-12 col-md-4">
              <FieldLabel htmlFor="task_pack_name">{i18next.t('Task Pack')}</FieldLabel>
              <select
                id="task_pack_name"
                name="task_pack_name"
                className={cn(SELECT_CLASS, { 'is-invalid': errors.task_pack_name })}
                value={formData.task_pack_name}
                onChange={handleChange}
              >
                <option value="">{i18next.t('Select a task pack')}</option>
                {taskPackNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {renderError('task_pack_name')}
            </div>
          )}

          {formData.task_provider === 'tags' && (
            <div className="col-12 col-md-4">
              <FieldLabel htmlFor="tags">{i18next.t('Tags (comma separated)')}</FieldLabel>
              <input
                type="text"
                id="tags"
                name="tags"
                aria-label="Tags"
                className={cn(INPUT_CLASS, { 'is-invalid': errors.tags })}
                value={formData.tags}
                onChange={handleChange}
                placeholder="strings,math"
              />
              {renderError('tags')}
            </div>
          )}
        </div>
      </FormSection>

      {/* Tournament Settings */}
      <FormSection title={i18next.t('Tournament Settings')}>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="type">{i18next.t('Tournament Type')}</FieldLabel>
            <select
              id="type"
              name="type"
              className={cn(SELECT_CLASS, { 'is-invalid': errors.type })}
              value={formData.type}
              onChange={handleChange}
            >
              {TOURNAMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {i18next.t(type.label)}
                </option>
              ))}
            </select>
            <FieldHelp text={i18next.t(TYPE_DESCRIPTIONS[formData.type])} />
            {renderError('type')}
          </div>

          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="players_limit">{i18next.t('Players Limit')}</FieldLabel>
            <select
              id="players_limit"
              name="players_limit"
              className={cn(SELECT_CLASS, { 'is-invalid': errors.players_limit })}
              value={formData.players_limit}
              onChange={handleChange}
            >
              {PLAYERS_LIMITS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </select>
            <FieldHelp text={i18next.t('Maximum number of players who can join.')} />
            {renderError('players_limit')}
          </div>

          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="score_strategy">{i18next.t('Score Strategy')}</FieldLabel>
            <select
              id="score_strategy"
              name="score_strategy"
              className={cn(SELECT_CLASS, { 'is-invalid': errors.score_strategy })}
              value={formData.score_strategy}
              onChange={handleChange}
              disabled={isLadder}
            >
              {SCORE_STRATEGIES.map((strategy) => (
                <option key={strategy.value} value={strategy.value}>
                  {i18next.t(strategy.label)}
                </option>
              ))}
            </select>
            <FieldHelp
              text={
                isLadder
                  ? i18next.t('Ladder always uses a static base score per task.')
                  : i18next.t(SCORE_STRATEGY_DESCRIPTIONS[formData.score_strategy])
              }
            />
            {renderError('score_strategy')}
          </div>

          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="rounds_limit">{i18next.t('Rounds Limit')}</FieldLabel>
            <select
              id="rounds_limit"
              name="rounds_limit"
              className={cn(SELECT_CLASS, { 'is-invalid': errors.rounds_limit })}
              value={formData.rounds_limit}
              onChange={handleChange}
            >
              {Array.from({ length: 42 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <FieldHelp
              text={
                isLadder
                  ? i18next.t('For Ladder, this is the number of matching rounds.')
                  : i18next.t('Number of rounds to play.')
              }
            />
            {renderError('rounds_limit')}
          </div>

          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="break_duration_seconds">
              {i18next.t('Break Duration (seconds)')}
            </FieldLabel>
            <input
              type="number"
              id="break_duration_seconds"
              name="break_duration_seconds"
              aria-label="Break Duration (seconds)"
              className={cn(INPUT_CLASS, { 'is-invalid': errors.break_duration_seconds })}
              value={formData.break_duration_seconds}
              onChange={handleChange}
              min={0}
              max={100000}
            />
            <FieldHelp text={i18next.t('Pause between rounds, in seconds.')} />
            {renderError('break_duration_seconds')}
          </div>
        </div>
      </FormSection>

      {/* Timeout Configuration */}
      <FormSection title={i18next.t('Timeout Configuration')}>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="timeout_mode" active={!isLadder}>
              {i18next.t('Timeout Mode')}
            </FieldLabel>
            <select
              id="timeout_mode"
              name="timeout_mode"
              className={SELECT_CLASS}
              value={formData.timeout_mode}
              onChange={handleChange}
              disabled={isLadder}
            >
              {TIMEOUT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {i18next.t(mode.label)}
                </option>
              ))}
            </select>
            <FieldHelp text={i18next.t(TIMEOUT_DESCRIPTIONS[formData.timeout_mode])} />
          </div>

          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="round_timeout_seconds" active={roundTimeoutActive}>
              {isLadder
                ? i18next.t('Matching interval (sec)')
                : i18next.t('Round Timeout (seconds)')}
            </FieldLabel>
            <input
              type="number"
              id="round_timeout_seconds"
              name="round_timeout_seconds"
              aria-label="Round Timeout (seconds)"
              className={cn(INPUT_CLASS, { 'is-invalid': errors.round_timeout_seconds })}
              value={roundTimeoutActive ? (formData.round_timeout_seconds ?? '') : ''}
              onChange={handleChange}
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
            {renderError('round_timeout_seconds')}
          </div>

          <div className="col-12 col-md-4">
            <FieldLabel htmlFor="tournament_timeout_seconds" active={tournamentTimeoutActive}>
              {i18next.t('Tournament Timeout (seconds)')}
            </FieldLabel>
            <input
              type="number"
              id="tournament_timeout_seconds"
              name="tournament_timeout_seconds"
              aria-label="Tournament Timeout (seconds)"
              className={cn(INPUT_CLASS, { 'is-invalid': errors.tournament_timeout_seconds })}
              value={tournamentTimeoutActive ? (formData.tournament_timeout_seconds ?? '') : ''}
              onChange={handleChange}
              min={60}
              max={36000}
              disabled={!tournamentTimeoutActive}
            />
            <FieldHelp text={i18next.t('Total time for the whole tournament, in seconds.')} />
            {renderError('tournament_timeout_seconds')}
          </div>
        </div>
      </FormSection>

      {/* Advanced Settings (admins only) */}
      {isAdmin && (
        <FormSection title={i18next.t('Advanced Settings')}>
          <div className="row g-3">
            <div className="col-12">
              <FieldLabel htmlFor="meta_json">{i18next.t('Meta JSON')}</FieldLabel>
              <textarea
                id="meta_json"
                name="meta_json"
                aria-label="Meta JSON"
                className={cn(INPUT_CLASS, { 'is-invalid': errors.meta_json })}
                value={formData.meta_json}
                onChange={handleChange}
                rows={3}
              />
              <FieldHelp text={i18next.t('Advanced JSON configuration. Leave as {} if unsure.')} />
              {renderError('meta_json')}
            </div>
          </div>
        </FormSection>
      )}

      {/* Action Buttons */}
      <div className="d-flex justify-content-between align-items-center mt-4">
        {showCancelButton && (
          <button
            type="button"
            className="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded"
            onClick={onCancel ?? undefined}
            disabled={isSubmitting}
          >
            {i18next.t(cancelButtonText)}
          </button>
        )}
        <button
          type="submit"
          className="btn btn-secondary cb-btn-secondary cb-rounded px-4"
          disabled={isSubmitting}
        >
          {isSubmitting ? i18next.t('Submitting...') : i18next.t(submitButtonText)}
        </button>
      </div>
    </form>
  );
}

export default TournamentForm;
export type { TournamentFormValues };
