import { Alert, Badge, Button, Card, Collapse, Group, Progress, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconChevronRight, IconInfoCircle } from '@tabler/icons-react';
import { type CSSProperties, type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CodeEditor } from '@/features/game/editor/CodeEditor';
import { UserCard } from '@/features/users/UserCard';
import { LangIcon, langName } from '@/shared/LangIcon';
import { UserAvatar } from '@/shared/UserAvatar';

import { BatchChart, type ChartPoint } from './BatchChart';
import classes from './GameMl.module.css';
import type { MlBatch, MlPlayer, RiskLevel } from './types';

const RISK: Record<RiskLevel, { label: string; color: string }> = {
  none: { label: 'Looks human', color: 'green' },
  low: { label: 'Low risk', color: 'blue' },
  medium: { label: 'Suspicious', color: 'orange' },
  high: { label: 'Likely bot', color: 'red' },
};

/** The score at which the risk scorer says "high" (RiskScorer.classify/1). */
const HIGH_SCORE = 10;

const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const formatNumber = (value: unknown) => (isNum(value) ? value.toLocaleString() : '—');

export const formatMs = (value: unknown) => {
  if (!isNum(value)) return '—';
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
};

const pair = (...values: unknown[]) => values.map(formatNumber).join(' / ');

function StatRow({ label, value, hint, warn }: { label: string; value: ReactNode; hint?: ReactNode; warn?: boolean }) {
  return (
    <div className={classes.statRow}>
      <span className={classes.statLabel}>{label}</span>
      <span className={classes.statValue}>
        {value}
        {hint && (
          <span className={classes.hint} data-warn={warn || undefined}>
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={classes.panel}>
      <div className={classes.section}>{title}</div>
      {children}
    </div>
  );
}

interface PlayerReportProps {
  player: MlPlayer;
  /** This player's batches, oldest first. */
  batches: MlBatch[];
  /** A Mantine palette colour for the card edge and charts. */
  color: string;
}

/** The bot/human verdict for one player: risk, signals, code and keystroke stats, per-batch charts. */
export function PlayerReport({ player, batches, color }: PlayerReportProps) {
  const { t } = useTranslation();
  const [showCode, setShowCode] = useState(false);
  const report = player.report;
  const stats = report?.stats ?? null;
  const code = report?.code_analysis ?? null;
  const finalText = player.editor_text ?? '';
  const finalLength = report?.final_length ?? finalText.length;
  const templateLength = report?.template_length ?? 0;
  const added = report?.effective_added_length ?? 0;
  const score = report?.score ?? 0;
  const risk = RISK[report?.level ?? 'none'] ?? RISK.none;
  const signals = report?.signals ?? [];
  const typed = stats?.total_chars_inserted ?? 0;
  const coverage = added > 0 ? typed / added : null;
  const phrases = code?.gpt_phrase_matches ?? [];

  const series = useMemo(() => {
    const points = (value: (batch: MlBatch) => number): ChartPoint[] =>
      batches.map((batch) => {
        const start = batch.window_start_offset_ms ?? 0;
        return { start, end: Math.max(batch.window_end_offset_ms ?? start, start), value: value(batch) };
      });
    return {
      events: points((batch) => batch.event_count ?? 0),
      chars: points((batch) => (batch.summary?.chars_inserted ?? 0) - (batch.summary?.chars_deleted ?? 0)),
      keyDelta: points((batch) => batch.summary?.avg_key_delta_ms ?? 0),
      maxX: Math.max(0, ...batches.map((batch) => batch.window_end_offset_ms ?? batch.window_start_offset_ms ?? 0)),
    };
  }, [batches]);

  return (
    <Card padding="md" className={classes.card} style={{ '--player-color': `var(--mantine-color-${color}-5)` } as CSSProperties}>
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" wrap="nowrap" miw={0}>
            <UserAvatar user={player} size={36} radius="xl" />
            <Stack gap={0} miw={0}>
              <Group gap={6} wrap="nowrap" miw={0}>
                <LangIcon lang={player.lang} />
                <UserCard user={player}>
                  <Text span fw={700} c="bright" truncate>
                    {player.name || t('User #%{id}', { id: player.id })}
                  </Text>
                </UserCard>
                {player.is_bot && (
                  <Badge size="xs" variant="light" color="gray">
                    {t('Bot')}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed" ff="monospace">
                id {player.id} · {t('Rating')} {player.rating ?? '—'}
                {player.rank != null && ` · ${t('Rank')} #${player.rank}`} · {player.lang ? langName(player.lang) : '—'}
              </Text>
            </Stack>
          </Group>
          <div className={classes.risk}>
            <Badge size="md" variant="light" color={risk.color}>
              {t(risk.label)}
            </Badge>
            <Tooltip label={t('Risk score: 1+ low, 5+ suspicious, 10+ likely bot')}>
              <Stack gap={2} w={110}>
                <Text size="xs" c="dimmed" ff="monospace" ta="right">
                  {t('Score: %{score}', { score })}
                </Text>
                <Progress value={Math.min(100, (score / HIGH_SCORE) * 100)} color={risk.color} size="sm" aria-label={t('Risk score')} />
              </Stack>
            </Tooltip>
          </div>
        </Group>

        {!report && (
          <Alert variant="light" color="gray" icon={<IconInfoCircle size={16} />} py={6}>
            {t('No analysis for this player.')}
          </Alert>
        )}

        {report && !stats && (
          <Alert variant="light" color="orange" icon={<IconAlertTriangle size={16} />} py={6} title={t('No telemetry batches recorded.')}>
            {t('Either the player never typed, or their solution was injected via WebSocket without using the editor.')}
          </Alert>
        )}

        {signals.length > 0 && (
          <Alert variant="light" color={risk.color} icon={<IconAlertTriangle size={16} />} py={6} title={t('Signals')}>
            {/* Reasons are the risk scorer's English text. */}
            <ul className={classes.signals}>
              {signals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
          {code && (
            <Panel title={t('Final solution analysis')}>
              <StatRow label={t('Total chars / lines')} value={pair(code.total_chars, code.total_lines)} />
              <StatRow label={t('Code lines / comment lines')} value={pair(code.code_lines, code.comment_lines)} />
              <StatRow label={t('Comment-to-code ratio')} value={(code.comment_to_code_ratio ?? 0).toFixed(2)} />
              <StatRow label={t('Long comment lines (>40 chars)')} value={formatNumber(code.long_comment_lines ?? 0)} />
              <StatRow
                label={t('GPT-style phrase hits')}
                value={formatNumber(code.gpt_phrase_hits ?? 0)}
                warn={phrases.length > 0}
                hint={phrases.length > 0 ? `“${phrases.slice(0, 2).join('”, “')}”${phrases.length > 2 ? ', …' : ''}` : undefined}
              />
            </Panel>
          )}

          {report && (
            <Panel title={t('Typed vs final')}>
              <StatRow label={t('Final solution length')} value={formatNumber(finalLength)} />
              <StatRow label={t('Language template length')} value={formatNumber(templateLength)} hint={t('excluded from coverage')} />
              <StatRow label={t('Effective added length')} value={formatNumber(added)} />
              <StatRow label={t('Total chars typed')} value={formatNumber(typed)} />
              <StatRow
                label={t('Typed coverage')}
                value={coverage == null ? '—' : `${(coverage * 100).toFixed(0)}%`}
                warn
                hint={coverage != null && added >= 60 && coverage < 0.6 ? t('low → likely injected/pasted') : undefined}
              />
            </Panel>
          )}

          {stats && (
            <>
              <Panel title={t('Keystrokes')}>
                <StatRow label={t('Batches')} value={formatNumber(stats.batch_count)} />
                <StatRow label={t('Total events')} value={formatNumber(stats.total_events)} hint={`${(stats.events_per_sec ?? 0).toFixed(2)}/s`} />
                <StatRow label={t('Key events')} value={formatNumber(stats.total_key_events)} />
                <StatRow label={t('Printable keys')} value={formatNumber(stats.total_printable_keys)} />
                <StatRow
                  label={t('Chars inserted / deleted')}
                  value={pair(stats.total_chars_inserted, stats.total_chars_deleted)}
                  hint={t('%{rate} ins/s', { rate: (stats.chars_per_sec ?? 0).toFixed(2) })}
                />
                <StatRow label={t('Net Δ text')} value={formatNumber(stats.total_net_text_delta)} />
                <StatRow label={t('Backspace / Delete')} value={pair(stats.total_backspace, stats.total_delete)} />
                <StatRow label={t('Arrow keys')} value={formatNumber(stats.total_arrows)} />
                <StatRow label={t('Undo / Redo')} value={pair(stats.total_undo, stats.total_redo)} />
                <StatRow
                  label={t('Copy / Cut / Paste shortcuts')}
                  value={pair(stats.total_copy_shortcuts ?? 0, stats.total_cut_shortcuts ?? 0, stats.total_paste_attempts)}
                />
                <StatRow label={t('Paste blocked')} value={formatNumber(stats.total_paste_blocked)} />
              </Panel>

              <Panel title={t('Timing and edits')}>
                <StatRow label={t('Session length')} value={formatMs(stats.elapsed_ms)} />
                <StatRow label={t('Avg key delta')} value={formatMs(stats.avg_key_delta_ms)} />
                <StatRow label={t('Min / Max key delta')} value={`${formatMs(stats.min_key_delta_ms)} / ${formatMs(stats.max_key_delta_ms)}`} />
                <StatRow label={t('Idle pauses >2s')} value={formatNumber(stats.total_idle_pauses)} />
                <StatRow label={t('Multi-char inserts / deletes')} value={pair(stats.total_multi_char_inserts, stats.total_multi_char_deletes)} />
                <StatRow label={t('Multi-line inserts')} value={formatNumber(stats.total_multi_line_inserts)} />
                <StatRow
                  label={t('Largest single insert / delete')}
                  value={pair(stats.max_single_insert_len, stats.max_single_delete_len)}
                  warn
                  hint={stats.max_single_insert_len >= 8 ? t('≥8 → likely paste') : undefined}
                />
                <StatRow label={t('Large inserts (≥50)')} value={formatNumber(stats.total_large_inserts)} />
                <StatRow
                  label={t('Content changes / printable keys')}
                  value={pair(stats.total_content_changes, stats.total_printable_keys)}
                  warn
                  hint={stats.total_content_changes > stats.total_printable_keys + 1 ? t('more changes than keys → programmatic') : undefined}
                />
              </Panel>
            </>
          )}
        </SimpleGrid>

        {batches.length > 0 && (
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <BatchChart title={t('Events per batch')} points={series.events} maxX={series.maxX} kind="bar" />
            <BatchChart title={t('Net Δ chars per batch')} points={series.chars} maxX={series.maxX} kind="bar" />
            <BatchChart title={t('Avg key delta (ms) per batch')} points={series.keyDelta} maxX={series.maxX} kind="line" />
          </SimpleGrid>
        )}

        {finalText && (
          <Stack gap={6}>
            <Group>
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                leftSection={showCode ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                onClick={() => setShowCode((value) => !value)}
              >
                {t('Final submitted code (%{count} chars)', { count: finalLength })}
              </Button>
              {player.editor_lang && <LangIcon lang={player.editor_lang} />}
            </Group>
            <Collapse expanded={showCode}>
              {showCode && (
                <div className={classes.codeBox}>
                  <CodeEditor value={finalText} lang={player.editor_lang ?? player.lang ?? 'js'} readOnly allowClipboard fontSize={13} />
                </div>
              )}
            </Collapse>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
