import { useEffect } from 'react';

import { useTournamentStore } from './store';
import type { TournamentApi } from './useTournament';

/** Loads the name and level of each task id once per page (tournament:get_task), for match rows. */
export function useTaskNames(api: TournamentApi, taskIds: (number | null)[]) {
  const tasks = useTournamentStore((state) => state.tasks);
  const missing = [...new Set(taskIds.filter((id): id is number => id != null && !(id in tasks)))];
  const key = missing.join(',');

  useEffect(() => {
    if (!key || api.status !== 'joined') return;
    const { setTask } = useTournamentStore.getState();
    for (const id of key.split(',').map(Number)) {
      setTask(id, 'loading');
      api
        .push<{ name: string; level: string }>('tournament:get_task', { task_id: id })
        .then((task) => setTask(id, { name: task.name, level: task.level }))
        .catch(() => undefined);
    }
  }, [api, key]);

  return tasks;
}
