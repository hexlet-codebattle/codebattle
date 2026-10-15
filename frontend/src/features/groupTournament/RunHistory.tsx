import { Button, Loader, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconBrandVscode, IconExternalLink, IconPlus } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { formatClockDuration } from '@/features/tournament/clock';

import type { GroupTournament, LeaderboardEntry, Run } from './types';
import { isRoundRun, isSliceRun, placeFor, runTitle, vscodeFolderUrl } from './utils';
import classes from './GroupTournament.module.css';

function RunItem({ run, runs, active, myEntry, onSelect }: { run: Run; runs: Run[]; active: boolean; myEntry: LeaderboardEntry | null; onSelect: () => void }) {
  const { t } = useTranslation();
  const roundRun = isRoundRun(run);
  const pending = run.status === 'pending';
  const failed = run.status === 'error' || run.status === 'timeout';
  const place = roundRun ? (run.place ?? placeFor(run, myEntry)) : null;

  return (
    <UnstyledButton
      className={classes.runItem}
      data-active={active || undefined}
      data-kind={roundRun ? 'round' : 'test'}
      data-status={run.status}
      disabled={failed}
      onClick={onSelect}
    >
      <div className={classes.runItemTop}>
        <Text span size="sm" fw={700} truncate>
          {runTitle(run, runs)}
        </Text>
        {isSliceRun(run) && run.slice_index != null && (
          <Text span size="xs" c="dimmed" style={{ flex: 'none' }}>
            {t('Group %{n}', { n: run.slice_index + 1 })}
          </Text>
        )}
      </div>
      <div className={classes.runItemMeta}>
        {pending ? (
          <>
            <Loader size={10} />
            <span>{t('Running…')}</span>
          </>
        ) : (
          <>
            <span data-strong>
              {run.status === 'error'
                ? t('Error')
                : run.status === 'timeout'
                  ? t('Time Limit')
                  : t('Score: %{score}', { score: run.score ?? 0 })}
            </span>
            {roundRun && place != null && <span data-strong>{t('Place: #%{place}', { place })}</span>}
            {!roundRun && run.duration_ms != null && run.duration_ms >= 0 && (
              <span>{t('Time: %{duration}', { duration: formatClockDuration(run.duration_ms) })}</span>
            )}
          </>
        )}
      </div>
    </UnstyledButton>
  );
}

interface RunHistoryProps {
  status: string;
  tournament: GroupTournament | null;
  runs: Run[];
  selectedRunId: number | null;
  onSelect: (id: number) => void;
  repoUrl: string | null | undefined;
  /** Opens the in-app editor; null when solving happens elsewhere. */
  onAddSolution: (() => void) | null;
  leaderboard: LeaderboardEntry[];
  userId: number;
}

/** "Execution History": how to add a solution, then my runs, newest first. */
export function RunHistory({ status, tournament, runs, selectedRunId, onSelect, repoUrl, onAddSolution, leaderboard, userId }: RunHistoryProps) {
  const { t } = useTranslation();
  const open = status !== 'finished' && status !== 'waiting_participants';
  const externalUrl = open ? repoUrl : null;
  const vscodeUrl = open && !externalUrl ? vscodeFolderUrl(tournament?.local_folder) : null;
  const myEntry = useMemo(() => leaderboard.find((entry) => entry.user_id === userId) ?? null, [leaderboard, userId]);

  const addButton = externalUrl ? (
    <Button component="a" href={externalUrl} target="_blank" rel="noopener noreferrer" variant="default" fullWidth leftSection={<IconExternalLink size={16} />}>
      {t('Add solution')}
    </Button>
  ) : vscodeUrl ? (
    <Button component="a" href={vscodeUrl} variant="default" fullWidth leftSection={<IconBrandVscode size={16} />}>
      {t('Add solution')}
    </Button>
  ) : open && onAddSolution ? (
    <Button variant="default" fullWidth leftSection={<IconPlus size={16} />} onClick={onAddSolution}>
      {t('Add solution')}
    </Button>
  ) : null;

  return (
    <div className={classes.panel}>
      <div className={classes.panelTitle}>{t('Execution History')}</div>
      <Stack gap="xs" p="xs" className={classes.historyBody}>
        {addButton}
        {runs.length > 0 ? (
          <ScrollArea.Autosize mah="calc(100vh - 260px)" type="hover" offsetScrollbars>
            <Stack gap={6}>
              {runs.map((run) => (
                <RunItem key={run.id} run={run} runs={runs} active={run.id === selectedRunId} myEntry={myEntry} onSelect={() => onSelect(run.id)} />
              ))}
            </Stack>
          </ScrollArea.Autosize>
        ) : (
          <Text size="xs" c="dimmed" ta="center" py="sm">
            {t('No runs yet')}
          </Text>
        )}
      </Stack>
    </div>
  );
}
