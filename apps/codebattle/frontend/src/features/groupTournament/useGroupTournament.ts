import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useChannel } from '@/api/useChannel';
import { requestJson } from '@/shared/http';
import { useSharedProps } from '@/shared/useSharedProps';

import type {
  ExternalSetup,
  GroupTournament,
  Invite,
  InviteUpdate,
  JoinReply,
  Lang,
  LeaderboardEntry,
  RestPayload,
  Run,
  RunUpdate,
  Snapshot,
  Solution,
  StatusUpdate,
} from './types';

export interface GroupTournamentData {
  /** 'loading' until the channel join replies, then the tournament state. */
  status: string;
  invite: Invite;
  requireInvitation: boolean;
  runOnExternalPlatform: boolean;
  platformError: string | null;
  externalSetup: ExternalSetup | null;
  tournament: GroupTournament | null;
  leaderboard: LeaderboardEntry[];
  /** Newest first. */
  runs: Run[];
  solutionHistory: Solution[];
  langs: Lang[];
  playerLang: string | null;
  canModerate: boolean;
}

const INITIAL: GroupTournamentData = {
  status: 'loading',
  invite: { state: 'loading' },
  requireInvitation: true,
  runOnExternalPlatform: false,
  platformError: null,
  externalSetup: null,
  tournament: null,
  leaderboard: [],
  runs: [],
  solutionHistory: [],
  langs: [],
  playerLang: null,
  canModerate: false,
};

/**
 * Merges a full run list into what we have: keeps loaded details (viewer HTML, solution) and
 * stubs newer than the list, so the REST payload and the join reply can arrive in any order.
 */
function mergeRuns(current: Run[], incoming: Run[]) {
  const known = new Map(current.map((run) => [run.id, run]));
  const incomingIds = new Set(incoming.map((run) => run.id));
  const merged = incoming.map((run) => {
    const existing = known.get(run.id);
    return existing?.details_loaded ? { ...run, ...existing } : run;
  });
  return [...current.filter((run) => !incomingIds.has(run.id)), ...merged];
}

function upsertRun(runs: Run[], run: Partial<Run> & { id: number }) {
  const index = runs.findIndex((item) => item.id === run.id);
  if (index === -1) return [run as Run, ...runs];
  const next = runs.slice();
  next[index] = { ...next[index], ...run };
  return next;
}

const applySnapshot = (state: GroupTournamentData, snapshot: Partial<Snapshot>): GroupTournamentData => ({
  ...state,
  tournament: snapshot.group_tournament ?? state.tournament,
  leaderboard: snapshot.leaderboard ?? state.leaderboard,
  runs: snapshot.runs ? mergeRuns(state.runs, snapshot.runs) : state.runs,
  solutionHistory: snapshot.solution_history ?? state.solutionHistory,
  langs: snapshot.langs ?? state.langs,
  playerLang: snapshot.current_player?.lang ?? state.playerLang,
});

/**
 * State of `/group_tournaments/:id` for the player: the `group_tournament:<id>` channel
 * (join snapshot, invite/status/run pushes) plus the REST payload, which also prepares the
 * external setup on first visit. Also tracks the selected run and loads its details.
 */
export function useGroupTournament(id: number) {
  const { current_user: me } = useSharedProps();
  const [data, setData] = useState<GroupTournamentData>(INITIAL);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const requestedRef = useRef(new Set<number>());

  const applyInvite = useCallback((update: InviteUpdate) => {
    setData((state) => ({
      ...state,
      invite: { ...state.invite, ...update.invite },
      platformError: update.platform_error ?? null,
      externalSetup: update.external_setup,
    }));
  }, []);

  const channel = useChannel(`group_tournament:${id}`, {
    onJoin: (reply: JoinReply) => {
      setData((state) =>
        applySnapshot(
          {
            ...state,
            status: reply.status,
            invite: { ...state.invite, ...reply.invite },
            requireInvitation: reply.require_invitation,
            runOnExternalPlatform: reply.run_on_external_platform ?? false,
            platformError: reply.platform_error ?? null,
            externalSetup: reply.external_setup,
          },
          reply.snapshot,
        ),
      );
    },
    events: {
      'group_tournament:invite_updated': applyInvite,
      'group_tournament:status_updated': (update: StatusUpdate) => {
        setData((state) => ({
          ...state,
          status: update.status,
          tournament: update.group_tournament ? { ...state.tournament, ...update.group_tournament } : state.tournament,
          leaderboard: update.leaderboard ?? state.leaderboard,
        }));
      },
      // Admins on the tournament-wide topic also get everyone's test runs: keep only mine.
      'group_tournament:run_updated': (update: RunUpdate) => {
        if (update.user_id !== me.id) return;
        setData((state) => ({
          ...state,
          runs: upsertRun(state.runs, {
            id: update.run_id,
            kind: update.kind,
            status: update.status,
            score: update.score,
            duration_ms: update.duration_ms,
            slice_index: update.slice_index,
            round_position: update.round_position,
            player_ids: update.player_ids,
            inserted_at: update.inserted_at,
          }),
        }));
        // The stub has no result: follow the run and fetch the persisted row (viewer HTML).
        setSelectedRunId(update.run_id);
        requestedRef.current.delete(update.run_id);
        void loadDetails(update.run_id);
      },
    },
  });
  const { push } = channel;

  const loadDetails = useCallback(
    async (runId: number) => {
      if (requestedRef.current.has(runId)) return;
      requestedRef.current.add(runId);
      try {
        const { run } = await push<{ run: Run }>('group_tournament:run:request', { run_id: runId });
        setData((state) => ({ ...state, runs: upsertRun(state.runs, { ...run, details_loaded: true }) }));
      } catch {
        requestedRef.current.delete(runId);
      }
    },
    [push],
  );

  // REST payload: runs the server-side external setup and tells whether I may moderate.
  useEffect(() => {
    let cancelled = false;
    requestJson<RestPayload>('GET', `/api/v1/group_tournaments/${id}`)
      .then((payload) => {
        if (cancelled) return;
        setData((state) => ({ ...applySnapshot(state, payload), canModerate: payload.can_moderate }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Select the newest run until the player picks one; load details of the selected run.
  const effectiveRunId = selectedRunId ?? data.runs[0]?.id ?? null;
  const selectedRun = useMemo(
    () => data.runs.find((run) => run.id === effectiveRunId) ?? data.runs[0] ?? null,
    [data.runs, effectiveRunId],
  );

  useEffect(() => {
    if (channel.status !== 'joined' || !selectedRun || selectedRun.details_loaded) return;
    void loadDetails(selectedRun.id);
  }, [channel.status, selectedRun, loadDetails]);

  // The new solution heads the history, so its run (a stub until details load) shows this code.
  const submitSolution = useCallback(
    async (solution: string, lang: string) => {
      const reply = await push<{ solution: Solution | null }>('group_tournament:submit_solution', { solution, lang });
      const submitted = reply.solution;
      if (submitted) {
        setData((state) => ({
          ...state,
          playerLang: submitted.lang,
          solutionHistory: [submitted, ...state.solutionHistory.filter((item) => item.id !== submitted.id)],
        }));
      }
      return reply;
    },
    [push],
  );

  const startTournament = useCallback(async () => {
    const reply = await push<{ status?: string }>('start_group_tournament');
    setData((state) => ({ ...state, status: reply.status || 'active' }));
  }, [push]);

  const requestInviteUpdate = useCallback(async () => {
    applyInvite(await push<InviteUpdate>('request_invite_update'));
  }, [push, applyInvite]);

  /** The viewer iframe reports my place in a slice run. */
  const setRunPlace = useCallback((runId: number, place: number | null) => {
    setData((state) => (state.runs.some((run) => run.id === runId) ? { ...state, runs: upsertRun(state.runs, { id: runId, place }) } : state));
  }, []);

  return {
    ...data,
    channelStatus: channel.status,
    selectedRun,
    selectRun: setSelectedRunId,
    submitSolution,
    startTournament,
    requestInviteUpdate,
    setRunPlace,
  };
}

export type GroupTournamentApi = ReturnType<typeof useGroupTournament>;
