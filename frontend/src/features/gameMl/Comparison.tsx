import { Alert, Badge, Group, Progress, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { type CSSProperties, type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { CodeEditor } from '@/features/game/editor/LazyCodeEditor';
import { UserCard } from '@/features/users/UserCard';
import { LangIcon, langName } from '@/shared/LangIcon';
import { UserAvatar } from '@/shared/UserAvatar';

import { BatchChart, type ChartPoint, chartRange } from './BatchChart';
import { codeHeight, formatMs, formatNumber, HIGH_SCORE, isNum, pair, RISK } from './format';
import classes from './GameMl.module.css';
import type { MlBatch, MlPlayer } from './types';

/** A player with their column colour and telemetry batches (oldest first). */
export interface MlColumn {
  player: MlPlayer;
  batches: MlBatch[];
  color: string;
}

const colorStyle = (color: string) => ({ '--player-color': `var(--mantine-color-${color}-5)` }) as CSSProperties;

/** The players side by side: one column each, collapsing to a stack on phones. */
function Columns({ count, children }: { count: number; children: ReactNode }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: Math.max(count, 1) }} spacing="md">
      {children}
    </SimpleGrid>
  );
}

function PlayerName({ player }: { player: MlPlayer }) {
  const { t } = useTranslation();
  return (
    <UserCard user={player}>
      <Text span fw={700} c="bright" truncate>
        {player.name || t('User #%{id}', { id: player.id })}
      </Text>
    </UserCard>
  );
}

/** Who the player is, the verdict and the scorer's reasons. */
function PlayerHeader({ column }: { column: MlColumn }) {
  const { t } = useTranslation();
  const { player } = column;
  const report = player.report;
  const hasActivity = report?.stats && (report.stats.total_key_events > 0 || report.stats.total_content_changes > 0);
  const risk = hasActivity ? RISK[report?.level ?? 'none'] ?? RISK.none : { label: 'Insufficient telemetry', color: 'gray' };
  const score = report?.score ?? 0;
  const signals = report?.signals ?? [];
  const qualityIssues: Record<string, string> = {
    missing_batch_identity: t('Missing telemetry batch identity'),
    missing_batch_sequence: t('Missing telemetry batches'),
    multiple_collector_sessions: t('Multiple editor sessions'),
    incomplete_edit_coverage: t('Incomplete edit coverage'),
    excluded_post_game_batches: t('Batches outside competitive play excluded'),
    legacy_collector: t('Legacy telemetry'),
    inconsistent_key_timing: t('Conflicting timing counters'),
    outside_game_window: t('Timing exceeds game duration'),
    overlapping_key_windows: t('Overlapping telemetry windows'),
    incomplete_key_boundaries: t('Missing key timing boundaries'),
  };

  return (
    <div className={classes.playerHead} style={colorStyle(column.color)}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap" miw={0}>
          <UserAvatar user={player} size={36} radius="xl" />
          <Stack gap={0} miw={0}>
            <Group gap={6} wrap="nowrap" miw={0}>
              <LangIcon lang={player.lang} />
              <PlayerName player={player} />
              {player.is_bot && (
                <Badge size="xs" variant="light" color="gray">
                  {t('Bot')}
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed" ff="monospace" truncate>
              id {player.id} · {t('Rating')} {player.rating ?? '—'}
              {player.rank != null && ` · ${t('Rank')} #${player.rank}`} · {player.lang ? langName(player.lang) : '—'}
            </Text>
          </Stack>
        </Group>
        {report && (
          <Tooltip label={t('Heuristic score, not a probability. 5+ suggests review; 10+ indicates stronger signals.')}>
            <Stack gap={4} align="flex-end">
              <Badge size="md" variant="light" color={risk.color}>
                {t(risk.label)}
              </Badge>
              {(hasActivity || score > 0) && (
                <Group gap={6} wrap="nowrap">
                  <Progress value={Math.min(100, (score / HIGH_SCORE) * 100)} color={risk.color} size="sm" w={64} aria-label={t('Risk score')} />
                  <Text size="xs" c="dimmed" ff="monospace">
                    {score}
                  </Text>
                </Group>
              )}
            </Stack>
          </Tooltip>
        )}
      </Group>

      {!report && (
        <Text size="xs" c="dimmed" mt="sm">
          {player.is_bot ? t('Bots are not analyzed.') : t('No analysis for this player.')}
        </Text>
      )}

      {report && !hasActivity && (
        <Alert variant="light" color="orange" icon={<IconAlertTriangle size={16} />} py={6} mt="sm" title={t('Insufficient telemetry')}>
          {t('Missing telemetry does not establish automation. Check the replay for connection gaps and editor activity.')}
        </Alert>
      )}

      {hasActivity && Boolean(report?.stats?.quality_issues?.length) && (
        <Alert variant="light" color="gray" icon={<IconInfoCircle size={16} />} py={6} mt="sm" title={t('Telemetry limitations')}>
          <Text size="xs">{t('Unreliable timing features are excluded from scoring.')}</Text>
          <Text size="xs" c="dimmed">
            {report?.stats?.quality_issues?.map((issue) => qualityIssues[issue] ?? t('Incomplete telemetry')).join(', ')}
          </Text>
        </Alert>
      )}

      {signals.length > 0 && (
        <Alert variant="light" color={risk.color} icon={<IconAlertTriangle size={16} />} py={6} mt="sm" title={t('Signals')}>
          {/* Reasons are the risk scorer's English text. */}
          <ul className={classes.signals}>
            {(report?.evidence?.length ? report.evidence : signals.map(message => ({ message, code: 'legacy', weight: 0, replay_offset_ms: null }))).map((signal, index) => (
              <li key={`${signal.code}-${index}`}>
                {signal.message}
                {signal.replay_offset_ms != null && <> · {Math.round(signal.replay_offset_ms / 1000)} s</>}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {hasActivity && signals.length === 0 && (
        <Group gap={6} mt="sm" c="dimmed">
          <IconInfoCircle size={14} />
          <Text size="xs">{t('No signals.')}</Text>
        </Group>
      )}
    </div>
  );
}

export function PlayerHeaders({ columns }: { columns: MlColumn[] }) {
  return (
    <Columns count={columns.length}>
      {columns.map((column) => (
        <PlayerHeader key={column.player.id} column={column} />
      ))}
    </Columns>
  );
}

// ── Head-to-head metrics ─────────────────────────────────────────────

interface Cell {
  value: ReactNode;
  /** The number behind the bar (bars of a row are scaled to its larger value). */
  bar?: number;
  /** A comment on this value (shown under it). */
  hint?: ReactNode;
  /** The value looks bot-like. */
  warn?: boolean;
}

interface Metric {
  label: string;
  /** What the metric means (a tooltip on the label). */
  help?: string;
  cell: (player: MlPlayer) => Cell | null;
}

interface MetricGroup {
  title: string;
  rows: Metric[];
}

type Report = NonNullable<MlPlayer['report']>;
type Stats = NonNullable<Report['stats']>;
type CodeStats = NonNullable<Report['code_analysis']>;

function useMetricGroups(): MetricGroup[] {
  const { t } = useTranslation();

  return useMemo(() => {
    const report = (fn: (r: Report) => Cell) => (player: MlPlayer) => (player.report ? fn(player.report) : null);
    const code = (fn: (c: CodeStats) => Cell) => (player: MlPlayer) => (player.report?.code_analysis ? fn(player.report.code_analysis) : null);
    const stats = (fn: (s: Stats) => Cell) => (player: MlPlayer) => (player.report?.stats ? fn(player.report.stats) : null);
    const count = (value: number | undefined | null): Cell => ({ value: formatNumber(value ?? 0), bar: value ?? 0 });

    return [
      {
        title: t('Final solution'),
        rows: [
          { label: t('Final solution length'), cell: report((r) => count(r.final_length)) },
          {
            label: t('Language template length'),
            help: t('The starting code of the task; excluded from coverage.'),
            cell: report((r) => count(r.template_length)),
          },
          { label: t('Effective added length'), cell: report((r) => count(r.effective_added_length)) },
          {
            label: t('Recorded edit coverage'),
            help: t('Gross inserted characters compared with final added length. Includes editor assistance and repeated replacements.'),
            cell: report((r) => {
              const added = r.effective_added_length ?? 0;
              const typed = r.stats?.total_chars_inserted;
              if (!isNum(typed) || added <= 0) return { value: '—' };
              const coverage = typed / added;
              const low = added >= 60 && coverage < 0.6;
              return { value: `${(coverage * 100).toFixed(0)}%`, bar: coverage, warn: low, hint: low ? t('Incomplete telemetry or unrecorded edits') : undefined };
            }),
          },
          { label: t('Total chars / lines'), cell: code((c) => ({ value: pair(c.total_chars, c.total_lines), bar: c.total_chars })) },
          { label: t('Code lines / comment lines'), cell: code((c) => ({ value: pair(c.code_lines, c.comment_lines), bar: c.code_lines })) },
          {
            label: t('Comment-to-code ratio'),
            cell: code((c) => ({ value: (c.comment_to_code_ratio ?? 0).toFixed(2), bar: c.comment_to_code_ratio ?? 0 })),
          },
          { label: t('Long comment lines (>40 chars)'), cell: code((c) => count(c.long_comment_lines)) },
          {
            label: t('GPT-style phrase hits'),
            cell: code((c) => {
              const phrases = c.gpt_phrase_matches ?? [];
              return {
                ...count(c.gpt_phrase_hits),

                hint: phrases.length > 0 ? `“${phrases.slice(0, 2).join('”, “')}”${phrases.length > 2 ? ', …' : ''}` : undefined,
              };
            }),
          },
        ],
      },
      {
        title: t('Keystrokes'),
        rows: [
          { label: t('Batches'), cell: stats((s) => count(s.batch_count)) },
          { label: t('Total events'), cell: stats((s) => ({ ...count(s.total_events), hint: s.timing_reliable === false ? undefined : `${(s.events_per_sec ?? 0).toFixed(2)}/s` })) },
          { label: t('Key events'), cell: stats((s) => count(s.total_key_events)) },
          { label: t('Printable keys'), cell: stats((s) => count(s.total_printable_keys)) },
          {
            label: t('Chars inserted / deleted'),
            cell: stats((s) => ({
              value: pair(s.total_chars_inserted, s.total_chars_deleted),
              bar: s.total_chars_inserted,
              hint: s.timing_reliable === false ? undefined : t('%{rate} ins/s', { rate: (s.chars_per_sec ?? 0).toFixed(2) }),
            })),
          },
          {
            label: t('Assisted chars / completions'),
            help: t('Inserted by the editor for a keystroke: auto-indent, closing brackets, accepted autocomplete. Not counted as pasted.'),
            cell: stats((s) => ({ value: pair(s.total_assisted_chars, s.total_completion_inserts), bar: s.total_assisted_chars ?? 0 })),
          },
          {
            label: t('Editor command inserts'),
            help: t('Edits attributed to editor commands, including Vim. An origin hint, not proof of fair play.'),
            cell: stats((s) => count(s.total_command_inserts)),
          },
          {
            label: t('Pasted chars'),
            help: t('Pastes can only bring back code copied from this editor.'),
            cell: stats((s) => (s.paste_tracked ? count(s.total_paste_chars) : { value: '—' })),
          },
          { label: t('Net Δ text'), cell: stats((s) => count(s.total_net_text_delta)) },
          { label: t('Backspace / Delete'), cell: stats((s) => ({ value: pair(s.total_backspace, s.total_delete), bar: s.total_backspace + s.total_delete })) },
          { label: t('Arrow keys'), cell: stats((s) => count(s.total_arrows)) },
          { label: t('Undo / Redo'), cell: stats((s) => ({ value: pair(s.total_undo, s.total_redo), bar: s.total_undo + s.total_redo })) },
          {
            label: t('Copy / Cut / Paste shortcuts'),
            cell: stats((s) => ({
              value: pair(s.total_copy_shortcuts ?? 0, s.total_cut_shortcuts ?? 0, s.total_paste_attempts),
              bar: (s.total_copy_shortcuts ?? 0) + (s.total_cut_shortcuts ?? 0) + s.total_paste_attempts,
            })),
          },
          { label: t('Paste blocked'), cell: stats((s) => ({ ...count(s.total_paste_blocked), warn: s.total_paste_blocked > 0 })) },
        ],
      },
      {
        title: t('Timing and edits'),
        rows: [
          { label: t('Session length'), cell: stats((s) => s.timing_reliable === false ? { value: '—' } : { value: formatMs(s.elapsed_ms), bar: s.elapsed_ms }) },
          { label: t('Avg key delta'), cell: stats((s) => s.timing_reliable === false ? { value: '—' } : { value: formatMs(s.avg_key_delta_ms), bar: s.avg_key_delta_ms }) },
          {
            label: t('Min / Max key delta'),
            cell: stats((s) => s.timing_reliable === false ? { value: '—' } : { value: `${formatMs(s.min_key_delta_ms)} / ${formatMs(s.max_key_delta_ms)}`, bar: s.max_key_delta_ms }),
          },
          { label: t('Idle pauses >2s'), cell: stats((s) => s.idle_pauses_reliable ? count(s.total_idle_pauses) : { value: '—' }) },
          {
            label: t('Multi-char inserts / deletes'),
            cell: stats((s) => ({ value: pair(s.total_multi_char_inserts, s.total_multi_char_deletes), bar: s.total_multi_char_inserts })),
          },
          { label: t('Multi-line inserts'), cell: stats((s) => ({ ...count(s.total_multi_line_inserts), warn: s.total_multi_line_inserts > 0 })) },
          {
            label: t('Largest single insert / delete'),
            cell: stats((s) => ({
              value: pair(s.max_single_insert_len, s.max_single_delete_len),
              bar: s.max_single_insert_len,
              warn: s.max_single_insert_len >= 8,
              hint: s.max_single_insert_len >= 8 ? t('Bulk edit; review its origin') : undefined,
            })),
          },
          { label: t('Large inserts (≥50)'), cell: stats((s) => ({ ...count(s.total_large_inserts), warn: s.total_large_inserts > 0 })) },
          {
            label: t('Content changes / printable keys'),
            cell: stats((s) => {
              return {
                value: pair(s.total_content_changes, s.total_printable_keys),
                bar: s.total_content_changes,
              };
            }),
          },
        ],
      },
      {
        title: t('Focus and the server copy'),
        rows: [
          {
            label: t('Page focus loss / time unfocused'),
            help: t('Browser focus or visibility changes, including other windows and dialogs. Context only; does not affect the score.'),
            cell: stats((s) =>
              s.focus_tracked && isNum(s.total_blurs)
                ? { value: `${formatNumber(s.total_blurs)} / ${formatMs(s.total_away_ms)}`, bar: s.total_away_ms ?? 0 }
                : { value: '—' },
            ),
          },
          {
            label: t('Editor updates received'),
            help: t("The server's own copy of the editor: the client sends the code at most every 250 ms."),
            cell: report((r) => (r.editor_history ? count(r.editor_history.updates) : { value: '—' })),
          },
          {
            label: t('Largest jump between updates'),
            help: t('Most inserted characters (excluding spaces) in one received update. Connection gaps, undo and editor commands can also produce large updates.'),
            cell: report((r) => {
              if (!r.editor_history) return { value: '—' };
              const jump = r.editor_history.max_jump;
              return { ...count(jump), warn: jump >= 80, hint: jump >= 80 ? t('Large update; check the replay') : undefined };
            }),
          },
        ],
      },
    ];
  }, [t]);
}

/** One side of a row: the value and a bar growing away from the centre. */
function Side({ cell, max, side }: { cell: Cell | null; max: number; side: 'left' | 'right' }) {
  const share = cell && isNum(cell.bar) && max > 0 ? Math.max(0, cell.bar) / max : 0;
  return (
    <div className={classes.side} data-side={side} data-warn={cell?.warn || undefined}>
      <div className={classes.sideValue}>
        <span className={classes.value}>{cell ? cell.value : '—'}</span>
        {cell?.hint && <span className={classes.cellHint}>{cell.hint}</span>}
      </div>
      <div className={classes.track}>
        {share > 0 && <div className={classes.fill} style={{ width: `${Math.max(share * 100, 2)}%` }} />}
      </div>
    </div>
  );
}

/**
 * Head to head: player 1's values on the left, player 2's on the right, the metric between
 * them; each row's bars share a scale, so the longer bar is the larger value.
 */
export function VersusTable({ columns }: { columns: MlColumn[] }) {
  const { t } = useTranslation();
  const groups = useMetricGroups();
  const [left, right] = columns;
  if (!left) return null;

  return (
    <div className={classes.versus}>
      <div className={classes.versusHead}>
        <div className={classes.headSide} data-side="left" style={colorStyle(left.color)}>
          <span className={classes.playerDot} />
          <PlayerName player={left.player} />
        </div>
        <div className={classes.headMid}>{t('vs')}</div>
        <div className={classes.headSide} data-side="right" style={right ? colorStyle(right.color) : undefined}>
          {right && (
            <>
              <PlayerName player={right.player} />
              <span className={classes.playerDot} />
            </>
          )}
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.title} className={classes.versusGroup}>
          <div className={classes.groupTitle}>{group.title}</div>
          {group.rows.map((metric) => {
            const leftCell = metric.cell(left.player);
            const rightCell = right ? metric.cell(right.player) : null;
            const max = Math.max(leftCell?.bar ?? 0, rightCell?.bar ?? 0);
            return (
              <div key={metric.label} className={classes.versusRow}>
                <div style={colorStyle(left.color)}>
                  <Side cell={leftCell} max={max} side="left" />
                </div>
                <div className={classes.metricName}>
                  {metric.help ? (
                    <Tooltip label={metric.help} multiline maw={260} withArrow>
                      <span className={classes.help}>{metric.label}</span>
                    </Tooltip>
                  ) : (
                    metric.label
                  )}
                </div>
                <div style={right ? colorStyle(right.color) : undefined}>{right && <Side cell={rightCell} max={max} side="right" />}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Per-batch charts ─────────────────────────────────────────────────

const toPoints = (batches: MlBatch[], value: (batch: MlBatch) => number): ChartPoint[] =>
  batches.map((batch) => {
    const start = batch.window_start_offset_ms ?? 0;
    return { start, end: Math.max(batch.window_end_offset_ms ?? start, start), value: value(batch) };
  });

/** Each chart once per player, side by side on shared time and value axes. */
export function BatchCharts({ columns }: { columns: MlColumn[] }) {
  const { t } = useTranslation();
  const maxX = Math.max(
    0,
    ...columns.flatMap((column) => column.batches.map((batch) => batch.window_end_offset_ms ?? batch.window_start_offset_ms ?? 0)),
  );
  const charts = [
    { title: t('Events per batch'), kind: 'bar' as const, value: (batch: MlBatch) => batch.event_count ?? 0 },
    {
      title: t('Net Δ chars per batch'),
      kind: 'bar' as const,
      value: (batch: MlBatch) => (batch.summary?.chars_inserted ?? 0) - (batch.summary?.chars_deleted ?? 0),
    },
    { title: t('Avg key delta (ms) per batch'), kind: 'line' as const, value: (batch: MlBatch) => batch.summary?.avg_key_delta_ms ?? 0 },
  ];

  if (columns.every((column) => column.batches.length === 0)) return null;

  return (
    <Stack gap="sm">
      {charts.map((chart) => {
        const series = columns.map((column) => toPoints(column.batches, chart.value));
        const range = chartRange(series.flat().map((point) => point.value));
        return (
          <div key={chart.title}>
            <div className={classes.section}>{chart.title}</div>
            <Columns count={columns.length}>
              {columns.map((column, index) => (
                <div key={column.player.id} className={classes.chartCell} style={colorStyle(column.color)}>
                  {column.batches.length > 0 ? (
                    <BatchChart ariaLabel={`${chart.title}: ${column.player.name}`} points={series[index]} maxX={maxX} kind={chart.kind} range={range} />
                  ) : (
                    <Text size="xs" c="dimmed" ta="center" py="lg">
                      {t('No telemetry batches recorded.')}
                    </Text>
                  )}
                </div>
              ))}
            </Columns>
          </div>
        );
      })}
    </Stack>
  );
}

// ── Final code ───────────────────────────────────────────────────────

/** Both players' final code, side by side. */
export function CodeColumns({ columns }: { columns: MlColumn[] }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className={classes.section}>{t('Final code')}</div>
      <Columns count={columns.length}>
        {columns.map(({ player, color }) => {
          const text = player.editor_text ?? '';
          const lang = player.editor_lang ?? player.lang ?? 'js';
          return (
            <Stack key={player.id} gap={6} miw={0} style={colorStyle(color)}>
              <Group gap={6} wrap="nowrap" miw={0}>
                <span className={classes.playerDot} />
                <PlayerName player={player} />
                <LangIcon lang={lang} />
                <Text size="xs" c="dimmed" ff="monospace">
                  {t('%{count} chars', { count: text.length })}
                </Text>
              </Group>
              {text ? (
                <div className={classes.codeBox} style={{ height: codeHeight(text) }}>
                  <CodeEditor value={text} lang={lang} readOnly allowClipboard fontSize={13} />
                </div>
              ) : (
                <Text size="xs" c="dimmed" className={classes.emptyCode}>
                  {t('No code.')}
                </Text>
              )}
            </Stack>
          );
        })}
      </Columns>
    </div>
  );
}
