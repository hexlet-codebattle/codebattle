import { Loader } from '@mantine/core';
import { IconChevronRight, IconFlask } from '@tabler/icons-react';
import { type KeyboardEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useGameStore } from '../store';
import type { CheckResult } from '../types';
import classes from '../GameRoom.module.css';

import { OutputPanel } from './OutputPanel';
import { TaskPanel } from './TaskPanel';

export type BriefTab = 'task' | 'tests';

/** "5/8" (or a spinner) on the Tests button. */
export function TestsScore({ playerId }: { playerId: number }) {
  const output = useGameStore((state) => state.outputs[playerId]);
  const checking = useGameStore((state) => Boolean(state.checking[playerId]));
  if (checking) return <Loader size={10} />;
  if (!output || output.asserts_count == null || !['ok', 'failure'].includes(output.status)) return null;
  return (
    <span className={classes.testsScore} data-ok={output.status === 'ok' || undefined}>
      {output.success_count}/{output.asserts_count}
    </span>
  );
}

const hasRun = (output: CheckResult | undefined, checking: boolean) => checking || Boolean(output && !['initial', 'started'].includes(output.status));

/**
 * A player's last run folded to their name, verdict and pass/fail squares (no values); a click
 * opens it in full.
 */
function RunCard({ playerId, before = false, onOpen }: { playerId: number; before?: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  const name = useGameStore((state) => state.players[playerId]?.name);
  const output = useGameStore((state) => state.outputs[playerId]);
  const checking = useGameStore((state) => Boolean(state.checking[playerId]));
  const ran = hasRun(output, checking);
  // Nothing to open before the first run.
  const open = ran ? onOpen : undefined;

  return (
    <div
      className={classes.opponentTests}
      data-before={before || undefined}
      data-clickable={open ? true : undefined}
      {...(open && {
        role: 'button',
        tabIndex: 0,
        'aria-label': `${t('Show the tests')}: ${name ?? t('Opponent')}`,
        onClick: open,
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          open();
        },
      })}
    >
      <span className={classes.opponentTestsLabel}>
        {name ?? t('Opponent')}
        {open && <IconChevronRight size={12} />}
      </span>
      {ran ? (
        <OutputPanel output={output} checking={checking} summaryOnly />
      ) : (
        <span className={classes.opponentTestsEmpty}>{t('No runs yet')}</span>
      )}
    </div>
  );
}

function TestsBody({ playerId, opponentId }: { playerId: number; opponentId: number | null }) {
  const { t } = useTranslation();
  const output = useGameStore((state) => state.outputs[playerId]);
  const checking = useGameStore((state) => Boolean(state.checking[playerId]));
  const opponentName = useGameStore((state) => (opponentId != null ? state.players[opponentId]?.name : undefined));
  const opponentOutput = useGameStore((state) => (opponentId != null ? state.outputs[opponentId] : undefined));
  const opponentChecking = useGameStore((state) => (opponentId != null ? Boolean(state.checking[opponentId]) : false));
  const ran = hasRun(output, checking);
  const [opponentOpen, setOpponentOpen] = useState(false);

  // My new run brings my results back.
  const [seenChecking, setSeenChecking] = useState(checking);
  if (seenChecking !== checking) {
    setSeenChecking(checking);
    if (checking) setOpponentOpen(false);
  }

  if (opponentOpen && opponentId != null && hasRun(opponentOutput, opponentChecking)) {
    return (
      <OutputPanel
        output={opponentOutput}
        checking={opponentChecking}
        checkingTitle={t('Checking…')}
        leftBefore={<RunCard playerId={playerId} before onOpen={() => setOpponentOpen(false)} />}
        label={<span className={classes.opponentTestsLabel}>{opponentName ?? t('Opponent')}</span>}
      />
    );
  }

  const opponent = opponentId != null ? <RunCard playerId={opponentId} onOpen={() => setOpponentOpen(true)} /> : null;

  if (!ran) {
    return (
      <div className={classes.outSplit}>
        <div className={classes.out}>
          <div className={classes.testsEmpty}>
            <IconFlask size={16} />
            {t('Run your code to see the test results here')} · Ctrl/⌘ + Enter
          </div>
          {opponent}
        </div>
      </div>
    );
  }

  return <OutputPanel output={output} checking={checking} leftExtra={opponent} />;
}

interface TaskBriefProps {
  /** Picked with the Task / Tests buttons in the top bar. */
  tab: BriefTab;
  /** Whose tests the Tests tab shows (the left seat: me when I play). */
  testsOf: number | null;
  /** The other seat: their pass/fail summary sits under mine. */
  opponentId?: number | null;
  /** Beside the tabs: the tournament round and standings. */
  aside?: ReactNode;
}

/** The strip under the top bar: the task or the tests, and (tournament games) the round and standings beside it. */
export function TaskBrief({ tab, testsOf, opponentId = null, aside }: TaskBriefProps) {
  const task = useGameStore((state) => state.game?.task);

  return (
    <section className={classes.brief} data-aside={aside ? true : undefined}>
      <div className={classes.briefMain}>
        <div className={classes.briefBody}>
          {tab === 'tests' && testsOf != null ? <TestsBody playerId={testsOf} opponentId={opponentId} /> : task ? <TaskPanel task={task} withPreview withTitle /> : null}
        </div>
      </div>
      {aside && <div className={classes.briefAside}>{aside}</div>}
    </section>
  );
}
