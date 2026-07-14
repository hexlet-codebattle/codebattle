import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { findSolutionForRun } from '../lib/groupBattle';
import { requestRunDetails } from '@/middlewares/GroupTournament';
import * as selectors from '../selectors';

interface Solution {
  solution?: string;
  lang?: string;
}

interface Run {
  id: number | string;
  detailsLoaded?: boolean;
  solution?: Solution;
  [key: string]: unknown;
}

interface GroupBattleRunData {
  runs?: Run[];
  solutionHistory?: Solution[];
  [key: string]: unknown;
}

const useGroupBattleRun = (data: GroupBattleRunData) => {
  const dispatch = useDispatch();
  const activeRunIdFromServer = useSelector(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => selectors.groupTournamentSelector(state).activeRunIdFromServer,
  );
  const activeRunFromServerTick = useSelector(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => selectors.groupTournamentSelector(state).activeRunFromServerTick,
  );
  const [selectedRun, setSelectedRun] = useState<Run | undefined>();
  const [runId, setRunId] = useState<number | string | undefined>();

  const selectRun = useCallback(
    (nextRunId: number | string | undefined) => {
      setRunId(nextRunId);

      if (!nextRunId || !data?.runs) {
        return;
      }

      const nextRun = data.runs.find((run) => run.id === nextRunId);

      if (nextRun && !nextRun.detailsLoaded) {
        requestRunDetails(nextRunId as number)(dispatch);
      }
    },
    [data?.runs, dispatch],
  );

  useEffect(() => {
    if (!data?.runs?.length) {
      return;
    }

    if (!runId) {
      const latestRun = data.runs[0];
      setSelectedRun(latestRun);
      selectRun(latestRun?.id);
      return;
    }

    const r = data.runs.find((run) => run.id === runId);
    setSelectedRun(r || data.runs[0]);
  }, [runId, data.runs, selectRun]);

  useEffect(() => {
    if (!activeRunFromServerTick || !activeRunIdFromServer) return;

    setRunId(activeRunIdFromServer);

    const runs = data?.runs || [];
    const nextRun = runs.find((run) => run.id === activeRunIdFromServer);

    if (nextRun) {
      setSelectedRun(nextRun);
    }

    // Always re-fetch on a server tick. A tick can carry either a "pending"
    // stub or a finished status; the broadcast itself doesn't include the
    // result map, so we ask the server for the freshly persisted row to pick
    // up viewerHtml/summary/history once the runner is done.
    requestRunDetails(activeRunIdFromServer as number)(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRunFromServerTick]);

  const solutionHistory = useMemo(() => data?.solutionHistory || [], [data?.solutionHistory]);
  const selectedRunSolution = useMemo(
    () => selectedRun?.solution || findSolutionForRun(selectedRun, solutionHistory),
    [selectedRun, solutionHistory],
  );

  const editorText = selectedRunSolution?.solution;
  const editorLang = selectedRunSolution?.lang;

  return {
    runId,
    selectedRun,
    selectedRunCode: editorText,
    selectedRunLang: editorLang,
    setSelectedRunId: selectRun,
  };
};

export default useGroupBattleRun;
