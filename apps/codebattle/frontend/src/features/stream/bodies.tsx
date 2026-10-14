import { Text } from '@mantine/core';
import { IconClock, IconHourglassHigh } from '@tabler/icons-react';
import { type CSSProperties, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OutputPanel, TestDetail } from '@/features/game/components/OutputPanel';
import { TaskPanel } from '@/features/game/components/TaskPanel';
import { isGameOver, useGameStore } from '@/features/game/store';
import type { Game } from '@/features/game/types';
import { formatClockDuration } from '@/features/tournament/clock';
import { parseServerDate } from '@/shared/date';
import { Markdown } from '@/shared/Markdown';

import classes from './Stream.module.css';

// The broadcast widgets, built from the game page's components and design tokens.

const ERROR_STATUSES = ['error', 'memory_leak', 'timeout', 'service_failure', 'service_timeout', 'client_timeout'];

/** The task (markdown, EN/RU) at the pane's font size; examples have a pane of their own. */
export function StreamTask({ fontSize }: { fontSize: number }) {
  const task = useGameStore((state) => state.game?.task);
  if (!task) return null;
  return (
    <div className={classes.scroll} style={{ '--task-font-size': `${fontSize}px` } as CSSProperties}>
      <TaskPanel task={task} hideExamples />
    </div>
  );
}

export function StreamExamples({ fontSize }: { fontSize: number }) {
  const examples = useGameStore((state) => state.game?.task?.examples);
  if (!examples?.trim()) return null;
  return (
    <div className={classes.scroll} style={{ fontSize }}>
      <Markdown>{`\`\`\`\n${examples.replace(/^```\w*\n?|```$/g, '')}\n\`\`\``}</Markdown>
    </div>
  );
}

/** Time left as big digits over a bar that fills as the time runs out (the game page's capsule, enlarged). */
export function StreamTimer({ kiosk = false }: { kiosk?: boolean }) {
  const { t } = useTranslation();
  const game = useGameStore((state) => state.game) as Game | null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const over = isGameOver(game?.state);
  const started = game?.starts_at ? parseServerDate(game.starts_at).getTime() : null;
  const limit = (game?.timeout_seconds ?? 0) * 1000;
  const remaining = over ? 0 : started && limit ? Math.max(0, started + limit - now) : null;
  const elapsed = started && limit ? clampUnit((now - started) / limit) : 0;
  const phase = remaining == null ? 'ok' : remaining <= 60_000 ? 'urgent' : remaining <= Math.max(limit * 0.3, 180_000) ? 'warn' : 'ok';
  const text = over && game?.duration_sec != null ? formatClockDuration(game.duration_sec * 1000) : remaining == null ? '--:--' : formatClockDuration(remaining);

  return (
    <div className={classes.timer} data-phase={over ? 'over' : phase} data-kiosk={kiosk || undefined}>
      <span className={classes.timerLabel}>
        {over ? <IconClock size="1em" /> : <IconHourglassHigh size="1em" />}
        {over ? t('Finished') : t('Time left')}
      </span>
      <span className={classes.timerDigits} style={kiosk ? { fontSize: `min(${Math.floor(160 / text.length)}vw, 60vh)` } : undefined}>
        {text}
      </span>
      {!over && limit > 0 && (
        <span className={classes.timerTrack}>
          <span style={{ width: `${elapsed * 100}%` }} />
        </span>
      )}
    </div>
  );
}

const clampUnit = (value: number) => Math.max(0, Math.min(1, value));

/** "N/100" as a big bar for viewers, then the game page's verdict and test squares. */
export function StreamTests({ playerId, kiosk = false, fontSize = null }: { playerId: number; kiosk?: boolean; fontSize?: number | null }) {
  const output = useGameStore((state) => state.outputs[playerId]);
  const checking = useGameStore((state) => Boolean(state.checking[playerId]));
  const result = useGameStore((state) => state.players[playerId]);

  const ran = output && !['initial', 'started'].includes(output.status);
  // A finished game resets check_result; fall back to the stored result percent.
  const percent = ran
    ? output.asserts_count
      ? ((output.success_count ?? 0) / output.asserts_count) * 100
      : 0
    : Number(result?.result_percent ?? 0);
  const isError = Boolean(ran && ERROR_STATUSES.includes(output.status));
  const full = percent >= 100;
  // The first failing test, as on the game page's Tests tab: what the viewers want to see.
  const asserts = ran ? (output.asserts ?? []) : [];
  const firstFailed = asserts.findIndex((assert) => assert.status !== 'success');

  return (
    <div className={classes.tests} data-kiosk={kiosk || undefined}>
      <div className={classes.bar} data-checking={checking || undefined}>
        <div className={classes.barFill} data-error={isError || undefined} data-full={full || undefined} style={{ width: `${clampUnit(percent / 100) * 100}%` }} />
        <span className={classes.barValue} style={kiosk && fontSize ? { fontSize } : undefined}>
          {Math.round(percent)}/100
        </span>
      </div>
      {!kiosk && ran && (
        <div className={classes.testsMore}>
          <div className={classes.testsSummary}>
            <OutputPanel output={output} checking={checking} summaryOnly />
          </div>
          {firstFailed >= 0 && asserts[firstFailed] && (
            <div className={classes.testsFailed}>
              <TestDetail assert={asserts[firstFailed]} index={firstFailed} active />
            </div>
          )}
          {isError && output.output_error ? <pre className={classes.testsError}>{output.output_error}</pre> : null}
        </div>
      )}
    </div>
  );
}

export function StreamWaiting({ label }: { label: string }) {
  return (
    <div className={classes.waiting}>
      <Text fw={800} size="xl" tt="uppercase" lts="0.1em">
        {label}
      </Text>
    </div>
  );
}
