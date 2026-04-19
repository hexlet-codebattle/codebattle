import { useEffect, useMemo, useState } from "react";

import { findSolutionForRun } from "../lib/groupBattle";

const useGroupBattleRun = (data) => {
  const [selectedRun, setSelectedRun] = useState();
  const [runId, setRunId] = useState();

  useEffect(() => {
    if (runId && data.runs) {
      const r = data.runs.find((run) => run.id === runId);
      setSelectedRun(r || data.runs[0]);
    }
  }, [runId, data.runs]);

  const solutionHistory = useMemo(() => data?.solutionHistory || [], [data?.solutionHistory]);
  const selectedRunSolution = useMemo(
    () => findSolutionForRun(selectedRun, solutionHistory),
    [selectedRun, solutionHistory],
  );

  return useMemo(() => {
    const editorText = selectedRunSolution?.solution;
    const editorLang = selectedRunSolution?.lang;

    return {
      runId,
      selectedRun,
      selectedRunCode: editorText,
      selectedRunLang: editorLang,
      setSelectedRunId: setRunId,
    };
  }, [runId, selectedRun, selectedRunSolution?.solution, selectedRunSolution?.lang]);
};

export default useGroupBattleRun;
