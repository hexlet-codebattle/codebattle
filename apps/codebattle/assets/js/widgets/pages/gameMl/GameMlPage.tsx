import React, { useMemo } from 'react';

import { camelizeKeys } from 'humps';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Group,
  List,
  Paper,
  Text,
  Title,
} from '@mantine/core';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getPageProp } from '@/inertia/pageProps';

const PLAYER_COLORS = ['#60a5fa', '#f472b6'];

const RISK_BADGE: Record<string, { label: string; color: string }> = {
  none: { label: 'Looks human', color: 'green' },
  low: { label: 'Low risk', color: 'cyan' },
  medium: { label: 'Suspicious', color: 'yellow' },
  high: { label: 'Likely bot', color: 'red' },
};

const formatMs = (ms: number) => {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

const formatNumber = (n: number) => (Number.isFinite(n) ? n.toLocaleString() : '—');

interface StatRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
}

function StatRow({ label, value, hint }: StatRowProps) {
  return (
    <Flex
      justify="space-between"
      align="center"
      py="xs"
      style={{ borderBottom: '1px solid #6c757d' }}
    >
      <Text c="dimmed" size="xs">
        {label}
      </Text>
      <Text c="white" ff="var(--mantine-font-family-monospace)" ta="right">
        {value}
        {hint ? (
          <Text span c="dimmed" size="xs" ml="xs">
            {hint}
          </Text>
        ) : null}
      </Text>
    </Flex>
  );
}

// Player/batch payloads are camelized Inertia props with deep, backend-defined
// shapes; typed loosely per migration conventions.
/* eslint-disable @typescript-eslint/no-explicit-any */
type MlPlayer = Record<string, any>;
type MlBatch = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface PlayerCardProps {
  player: MlPlayer;
  batches: MlBatch[];
  color: string;
}

function PlayerCard({ player, batches, color }: PlayerCardProps) {
  const report = player?.report || null;
  const stats = report?.stats || null;
  const codeAnalysis = report?.codeAnalysis || null;
  const finalText = player?.editorText || '';
  const finalLength = report?.finalLength ?? finalText.length;
  const templateLength = report?.templateLength ?? 0;
  const effectiveAddedLength = report?.effectiveAddedLength ?? 0;
  const score = report?.score ?? 0;
  const level = report?.level || 'none';
  const signals: string[] = report?.signals || [];
  const badge = RISK_BADGE[level] || RISK_BADGE.none;

  // Per-batch series for charts (raw batches, not aggregated).
  const series = useMemo(
    () =>
      batches.map((b, idx) => ({
        idx: idx + 1,
        startSec: Math.round((b.windowStartOffsetMs || 0) / 1000),
        events: b.eventCount,
        chars: (b.summary?.charsInserted || 0) - (b.summary?.charsDeleted || 0),
        avgKeyDeltaMs: b.summary?.avgKeyDeltaMs || 0,
      })),
    [batches],
  );

  return (
    <Paper withBorder radius="md" shadow="sm" mb="md" style={{ borderLeft: `4px solid ${color}` }}>
      <Group
        justify="space-between"
        align="center"
        bg="cbHighlight"
        py="sm"
        px="md"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Group gap="xs" align="center">
          {player?.avatarUrl ? (
            <Avatar src={player.avatarUrl} alt={player.name} size={28} radius="50%" />
          ) : null}
          <Box>
            <Title order={6} c="cbText" mb={0}>
              {player?.name || `User #${player?.id}`}
              {player?.isBot ? (
                <Badge color="gray" ml="xs">
                  bot
                </Badge>
              ) : null}
            </Title>
            <Text c="dimmed" size="xs">
              id={player?.id} · rating={player?.rating ?? '—'} · lang=
              {player?.lang ?? '—'}
            </Text>
          </Box>
        </Group>
        <Group gap="xs">
          <Badge color={badge.color}>{badge.label}</Badge>
          <Text c="dimmed" size="xs">
            score {score}
          </Text>
        </Group>
      </Group>

      <Box p="md">
        {!stats && (
          <Alert color="yellow" py="xs" mb="md">
            <strong>No telemetry batches recorded.</strong> Either the player never typed, or their
            solution was injected via WebSocket without using the editor.
          </Alert>
        )}

        {codeAnalysis && (
          <Grid mb="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text c="dimmed" size="xs">
                Final solution analysis
              </Text>
              <StatRow
                label="Total chars / lines"
                value={`${codeAnalysis.totalChars} / ${codeAnalysis.totalLines}`}
              />
              <StatRow
                label="Code lines / comment lines"
                value={`${codeAnalysis.codeLines} / ${codeAnalysis.commentLines}`}
              />
              <StatRow
                label="Comment-to-code ratio"
                value={(codeAnalysis.commentToCodeRatio || 0).toFixed(2)}
              />
              <StatRow
                label="Long comment lines (>40 chars)"
                value={codeAnalysis.longCommentLines || 0}
              />
              <StatRow
                label="GPT-style phrase hits"
                value={codeAnalysis.gptPhraseHits || 0}
                hint={
                  codeAnalysis.gptPhraseMatches?.length > 0
                    ? `“${codeAnalysis.gptPhraseMatches.slice(0, 2).join('”, “')}”${
                        codeAnalysis.gptPhraseMatches.length > 2 ? ', …' : ''
                      }`
                    : null
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text c="dimmed" size="xs">
                Typed vs final
              </Text>
              <StatRow label="Final solution length" value={formatNumber(finalLength)} />
              <StatRow
                label="Language template length"
                value={formatNumber(templateLength)}
                hint="excluded from coverage"
              />
              <StatRow label="Effective added length" value={formatNumber(effectiveAddedLength)} />
              <StatRow
                label="Total chars typed"
                value={formatNumber(stats?.totalCharsInserted || 0)}
              />
              <StatRow
                label="Typed coverage"
                value={
                  effectiveAddedLength > 0
                    ? `${(((stats?.totalCharsInserted || 0) / effectiveAddedLength) * 100).toFixed(0)}%`
                    : '—'
                }
                hint={
                  effectiveAddedLength >= 60 &&
                  (stats?.totalCharsInserted || 0) / effectiveAddedLength < 0.6
                    ? 'low → likely injected/pasted'
                    : null
                }
              />
            </Grid.Col>
          </Grid>
        )}

        {signals.length > 0 && (
          <Alert color="gray" py="xs" mb="md">
            <strong>Signals:</strong>
            <List size="xs" mt="xs" mb={0}>
              {signals.map((s) => (
                <List.Item key={s}>{s}</List.Item>
              ))}
            </List>
          </Alert>
        )}

        {finalText && (
          <Box component="details" mb="md">
            <Text component="summary" c="dimmed" size="xs" style={{ cursor: 'pointer' }}>
              Show final submitted code ({finalLength} chars, lang=
              {player?.editorLang || '?'})
            </Text>
            <Text
              component="pre"
              c="white"
              size="xs"
              mt="xs"
              p="xs"
              style={{
                background: '#0b1220',
                border: '1px solid #3a3f50',
                borderRadius: 4,
                maxHeight: 360,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {finalText}
            </Text>
          </Box>
        )}

        {stats && (
          <>
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <StatRow label="Batches" value={formatNumber(stats.batchCount)} />
                <StatRow
                  label="Total events"
                  value={formatNumber(stats.totalEvents)}
                  hint={`${(stats.eventsPerSec || 0).toFixed(2)}/s`}
                />
                <StatRow label="Key events" value={formatNumber(stats.totalKeyEvents)} />
                <StatRow label="Printable keys" value={formatNumber(stats.totalPrintableKeys)} />
                <StatRow
                  label="Chars inserted / deleted"
                  value={`${formatNumber(stats.totalCharsInserted)} / ${formatNumber(
                    stats.totalCharsDeleted,
                  )}`}
                  hint={`${(stats.charsPerSec || 0).toFixed(2)} ins/s`}
                />
                <StatRow label="Net Δ text" value={formatNumber(stats.totalNetTextDelta)} />
                <StatRow
                  label="Backspace / Delete"
                  value={`${stats.totalBackspace} / ${stats.totalDelete}`}
                />
                <StatRow label="Arrow keys" value={formatNumber(stats.totalArrows)} />
                <StatRow label="Undo / Redo" value={`${stats.totalUndo} / ${stats.totalRedo}`} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <StatRow label="Session length" value={formatMs(stats.elapsedMs)} />
                <StatRow label="Avg key delta" value={formatMs(stats.avgKeyDeltaMs)} />
                <StatRow
                  label="Min / Max key delta"
                  value={`${formatMs(stats.minKeyDeltaMs)} / ${formatMs(stats.maxKeyDeltaMs)}`}
                />
                <StatRow label="Idle pauses >2s" value={formatNumber(stats.totalIdlePauses)} />
                <StatRow
                  label="Multi-char inserts / deletes"
                  value={`${stats.totalMultiCharInserts} / ${stats.totalMultiCharDeletes}`}
                />
                <StatRow
                  label="Multi-line inserts"
                  value={formatNumber(stats.totalMultiLineInserts)}
                />
                <StatRow
                  label="Largest single insert / delete"
                  value={`${stats.maxSingleInsertLen} / ${stats.maxSingleDeleteLen}`}
                  hint={stats.maxSingleInsertLen >= 8 ? '≥8 → likely paste' : null}
                />
                <StatRow
                  label="Large inserts (≥50)"
                  value={formatNumber(stats.totalLargeInserts)}
                />
                <StatRow
                  label="Content changes / printable keys"
                  value={`${stats.totalContentChanges} / ${stats.totalPrintableKeys}`}
                  hint={
                    stats.totalContentChanges > stats.totalPrintableKeys + 1
                      ? 'more changes than keys → programmatic'
                      : null
                  }
                />
                <StatRow
                  label="Copy / Cut / Paste shortcuts"
                  value={`${stats.totalCopyShortcuts || 0} / ${stats.totalCutShortcuts || 0} / ${stats.totalPasteAttempts}`}
                />
                <StatRow label="Paste blocked" value={formatNumber(stats.totalPasteBlocked)} />
              </Grid.Col>
            </Grid>

            <Grid mt="lg">
              <Grid.Col span={{ base: 12, md: 6 }} h={220}>
                <Text c="dimmed" size="xs">
                  Events &amp; net chars per batch
                </Text>
                <ResponsiveContainer>
                  <BarChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#3a3f50" strokeDasharray="3 3" />
                    <XAxis dataKey="startSec" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#1f2937',
                        border: '1px solid #3a3f50',
                      }}
                      labelStyle={{ color: '#e5e7eb' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="events" fill={color} name="events" />
                    <Bar dataKey="chars" fill="#a78bfa" name="net Δ chars" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }} h={220}>
                <Text c="dimmed" size="xs">
                  Avg key delta (ms) per batch
                </Text>
                <ResponsiveContainer>
                  <LineChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#3a3f50" strokeDasharray="3 3" />
                    <XAxis dataKey="startSec" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#1f2937',
                        border: '1px solid #3a3f50',
                      }}
                      labelStyle={{ color: '#e5e7eb' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgKeyDeltaMs"
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Grid.Col>
            </Grid>
          </>
        )}
      </Box>
    </Paper>
  );
}

function GameMlPage() {
  const gameId = getPageProp<string | number>('game_id', 'unknown');
  const players = getPageProp<MlPlayer[]>('players', []).map((p) => camelizeKeys(p) as MlPlayer);
  const batches = getPageProp<MlBatch[]>('batches', []).map((b) => camelizeKeys(b) as MlBatch);

  const batchesByUser = useMemo(() => {
    const map = new Map<number, MlBatch[]>();
    batches.forEach((b) => {
      const list = map.get(b.userId) || [];
      list.push(b);
      map.set(b.userId, list);
    });
    map.forEach((list) =>
      list.sort((a, b) => (a.windowStartOffsetMs || 0) - (b.windowStartOffsetMs || 0)),
    );
    return map;
  }, [batches]);

  return (
    <Box
      c="cbText"
      w="100%"
      px="md"
      py="sm"
      style={{ background: '#0f172a', minHeight: '100vh' }}
    >
      <Flex justify="space-between" align="center" mb="md">
        <Title order={4} mb={0}>
          Game #{gameId} — bot/human signal review
        </Title>
        <Group gap="xs">
          <Button size="compact-sm" variant="outline" color="cyan" component="a" href="?refresh=1">
            ↻ Re-analyze
          </Button>
          <Button size="compact-sm" variant="default" component="a" href={`/games/${gameId}`}>
            ← Back to game
          </Button>
        </Group>
      </Flex>

      <Text c="dimmed" size="xs">
        Higher risk score / more signals → more bot-like. Always confirm by playing back the editor
        history. Reports are computed once and cached; click <em>Re-analyze</em> to force a fresh
        run.
      </Text>

      {players.length === 0 ? (
        <Alert color="yellow">No players found for this game.</Alert>
      ) : (
        players.map((player, idx) => (
          <PlayerCard
            key={player.id}
            player={player}
            batches={batchesByUser.get(player.id) || []}
            color={PLAYER_COLORS[idx % PLAYER_COLORS.length]}
          />
        ))
      )}
    </Box>
  );
}

export default GameMlPage;
