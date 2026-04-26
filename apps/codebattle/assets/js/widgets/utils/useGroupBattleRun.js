import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { findSolutionForRun } from "../lib/groupBattle";
import { requestRunDetails } from "@/middlewares/GroupTournament";
import * as selectors from "../selectors";

const useGroupBattleRun = (data) => {
  const dispatch = useDispatch();
  const activeRunIdFromServer = useSelector(
    (state) => selectors.groupTournamentSelector(state).activeRunIdFromServer,
  );
  const activeRunFromServerTick = useSelector(
    (state) => selectors.groupTournamentSelector(state).activeRunFromServerTick,
  );
  const [selectedRun, setSelectedRun] = useState();
  const [runId, setRunId] = useState();

  const selectRun = useCallback(
    (nextRunId) => {
      setRunId(nextRunId);

      if (!nextRunId || !data?.runs) {
        return;
      }

      const nextRun = data.runs.find((run) => run.id === nextRunId);

      if (nextRun && !nextRun.solution) {
        requestRunDetails(nextRunId)(dispatch);
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
      if (!nextRun.solution) {
        requestRunDetails(activeRunIdFromServer)(dispatch);
      }
    } else {
      requestRunDetails(activeRunIdFromServer)(dispatch);
    }
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
