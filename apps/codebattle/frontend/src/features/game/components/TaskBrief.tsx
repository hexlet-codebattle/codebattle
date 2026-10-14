import { Loader, Tooltip, UnstyledButton } from '@mantine/core';
import { IconFileDescription, IconFlask } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useGameStore } from '../store';
import classes from '../GameRoom.module.css';

import { OutputPanel } from './OutputPanel';
import { TaskPanel } from './TaskPanel';

export type BriefTab = 'task' | 'tests';

/** "5/8" (or a spinner) under the Tests icon. */
function TestsScore({ playerId }: { playerId: number }) {
  const output = useGameStore((state) => state.outputs[playerId]);
  const checking = useGameStore((state) => Boolean(state.checking[playerId]));
  if (checking) return <Loader size={10} />;
  if (!output || output.asserts_count == null || !['ok', 'failure'].includes(output.status)) return null;
  return (
    <span className={classes.railScore} data-ok={output.status === 'ok' || undefined}>
      {output.success_count}/{output.asserts_count}
    </span>
  );
}

function RailButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip label={label} position="right">
      <UnstyledButton className={classes.railButton} data-active={active || undefined} onClick={onClick} aria-label={label} aria-pressed={active}>
        {children}
      </UnstyledButton>
    </Tooltip>
  );
}

/** The other player's last run: their name, verdict and pass/fail squares (no values). */
function OpponentTests({ playerId }: { playerId: number }) {
  const { t } = useTranslation();
  const name = useGameStore((state) => state.players[playerId]?.name);
  const output = useGameStore((state) => state.outputs[playerId]);
  const checking = useGameStore((state) => Boolean(state.checking[playerId]));
  const ran = checking || (output && !['initial', 'started'].includes(output.status));

  return (
    <div className={classes.opponentTests}>
      <span className={classes.opponentTestsLabel}>{name ?? t('Opponent')}</span>
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
  const ran = checking || (output && !['initial', 'started'].includes(output.status));
  const opponent = opponentId != null ? <OpponentTests playerId={opponentId} /> : null;

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
  tab: BriefTab;
  onTab: (tab: BriefTab) => void;
  /** Whose tests the Tests tab shows (the left seat: me when I play). */
  testsOf: number | null;
  /** The other seat: their pass/fail summary sits under mine. */
  opponentId?: number | null;
  /** Beside the tabs: the tournament round and standings. */
  aside?: ReactNode;
}

/** The strip under the top bar: Task | Tests, and (tournament games) the round and standings beside it. */
export function TaskBrief({ tab, onTab, testsOf, opponentId = null, aside }: TaskBriefProps) {
  const { t } = useTranslation();
  const task = useGameStore((state) => state.game?.task);

  return (
    <section className={classes.brief} data-aside={aside ? true : undefined}>
      <div className={classes.briefMain}>
        {/* Task / Tests as a slim rail on the left: the description keeps the full height. */}
        <nav className={classes.rail}>
          <RailButton active={tab === 'task'} label={t('Task')} onClick={() => onTab('task')}>
            <IconFileDescription size={17} />
          </RailButton>
          {testsOf != null && (
            <RailButton active={tab === 'tests'} label={t('Tests')} onClick={() => onTab('tests')}>
              <IconFlask size={17} />
              <TestsScore playerId={testsOf} />
            </RailButton>
          )}
        </nav>
        <div className={classes.briefBody}>
          {tab === 'tests' && testsOf != null ? <TestsBody playerId={testsOf} opponentId={opponentId} /> : task ? <TaskPanel task={task} withPreview /> : null}
        </div>
      </div>
      {aside && <div className={classes.briefAside}>{aside}</div>}
    </section>
  );
}
