const getDateTimestamp = (value) => {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

export const findSolutionForRun = (run, solutionHistory) => {
  if (!run || !solutionHistory?.length) {
    return null;
  }

  const solutionWithSameId = solutionHistory.find((solution) => solution.id === run.id);

  if (solutionWithSameId) {
    return solutionWithSameId;
  }

  const runInsertedAtTimestamp = getDateTimestamp(run.insertedAt);

  if (runInsertedAtTimestamp === null) {
    return solutionHistory[0] || null;
  }

  return (
    solutionHistory.find((solution) => {
      const solutionInsertedAtTimestamp = getDateTimestamp(solution.insertedAt);

      return (
        solutionInsertedAtTimestamp !== null &&
        solutionInsertedAtTimestamp <= runInsertedAtTimestamp
      );
    }) ||
    solutionHistory[solutionHistory.length - 1] ||
    null
  );
};
