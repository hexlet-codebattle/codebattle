import { useEffect } from 'react';

const useTournamentPanel = (fetchData, state) => {
  useEffect(() => {
    if (state === 'active') {
      fetchData();

      const interval = setInterval(() => {
        fetchData();
      }, 1000 * 15);

      return () => {
        clearInterval(interval);
      };
    }

    if (state === 'finished') {
      fetchData();
    }

    return () => {};
  }, [state, fetchData]);
};

export default useTournamentPanel;
