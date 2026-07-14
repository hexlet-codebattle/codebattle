import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface SolutionEvolutionItem {
  id: string;
  status: string;
}

interface GroupTournamentRun {
  id: string | number;
  detailsLoaded?: boolean;
  [key: string]: unknown;
}

interface GroupTournamentData {
  groupTournament?: Record<string, unknown>;
  leaderboard?: unknown[];
  runs?: GroupTournamentRun[];
  [key: string]: unknown;
}

export interface GroupTournamentState {
  status: string; // "loading" | "active" | "finished"
  projectStatus: string; // "created" | "loading"
  projectLink: string | null;
  invite: {
    state: string; // "creating" | "pending" | "accepted" | "failed" | "loading"
    inviteLink: string | null;
  };
  requireInvitation: boolean;
  runOnExternalPlatform: boolean;
  platformError: unknown;
  externalSetup: unknown;
  solutionEvolution: SolutionEvolutionItem[];
  code: string;
  langSlug: string;
  data: GroupTournamentData;
  activeRunIdFromServer: string | number | null;
  activeRunFromServerTick: number;
}

const initialState: GroupTournamentState = {
  status: 'loading', // "loading" | "active" | "finished"
  projectStatus: 'loading', // "created" | "loading",
  projectLink: null, // string | null
  invite: {
    state: 'loading', // "creating" | "pending" | "accepted" | "failed" | "loading"
    inviteLink: null,
  },
  requireInvitation: true,
  runOnExternalPlatform: false,
  platformError: null,
  externalSetup: null,
  solutionEvolution: [], // Array<{ id: string, status: "creating" | "finished" }>
  code: '',
  langSlug: '',
  data: {},
  activeRunIdFromServer: null,
  activeRunFromServerTick: 0,
};

const groupTournament = createSlice({
  name: 'groupTournament',
  initialState,
  reducers: {
    setGroupTournamentData: (state, { payload }: PayloadAction<Partial<GroupTournamentState>>) => ({
      ...state,
      ...payload,
      invite: {
        ...state.invite,
        ...(payload.invite || {}),
      },
    }),
    updateGroupTournamentData: (
      state,
      { payload }: PayloadAction<Partial<GroupTournamentState>>,
    ) => ({
      ...state,
      ...payload,
    }),
    updateGroupTournamentStatus: (state, { payload }: PayloadAction<string>) => {
      state.status = payload;
    },
    mergeGroupTournament: (state, { payload }: PayloadAction<Record<string, unknown>>) => {
      state.data = state.data || {};
      state.data.groupTournament = {
        ...(state.data.groupTournament || {}),
        ...payload,
      };
    },
    setLeaderboard: (state, { payload }: PayloadAction<unknown[] | null | undefined>) => {
      state.data = state.data || {};
      state.data.leaderboard = payload || [];
    },
    updateInviteState: (state, { payload }: PayloadAction<string>) => {
      state.invite.state = payload;
    },
    updateInviteLink: (state, { payload }: PayloadAction<string | null>) => {
      state.invite.inviteLink = payload;
    },
    addSolutionEvolution: (state, { payload }: PayloadAction<SolutionEvolutionItem>) => {
      state.solutionEvolution.push(payload);
    },
    updateSolutionEvolutionStatus: (
      state,
      { payload }: PayloadAction<{ id: string; status: string }>,
    ) => {
      const { id, status } = payload;
      const solutionEvolutionItem = state.solutionEvolution.find((item) => item.id === id);
      if (solutionEvolutionItem) {
        solutionEvolutionItem.status = status;
      }
    },
    updateCode: (state, { payload }: PayloadAction<string>) => {
      state.code = payload;
    },
    updateLangSlug: (state, { payload }: PayloadAction<string>) => {
      state.langSlug = payload;
    },
    setData: (
      state,
      { payload }: PayloadAction<Partial<GroupTournamentData> | null | undefined>,
    ) => {
      // Merge so a later-arriving REST snapshot can't wipe fields that only
      // the channel push includes (notably `leaderboard`). Both sources race
      // on initial page load.
      state.data = { ...(state.data || {}), ...(payload || {}) };
    },
    setActiveRunIdFromServer: (state, { payload }: PayloadAction<string | number | null>) => {
      state.activeRunIdFromServer = payload;
      state.activeRunFromServerTick = (state.activeRunFromServerTick || 0) + 1;
    },
    applyRunStub: (
      state,
      { payload }: PayloadAction<{ runId: string | number } & Record<string, unknown>>,
    ) => {
      const {
        groupTournamentId,
        userId,
        runId,
        status,
        score,
        durationMs,
        kind,
        sliceIndex,
        roundPosition,
        playerIds,
        insertedAt,
      } = payload;

      state.data = state.data || {};

      // Don't clobber `detailsLoaded` / `result` on existing rows — the stub
      // carries no result map, so merging it as-is would wipe a previously
      // loaded viewer. The activeRunFromServerTick bump asks the caller to
      // re-fetch details to pick up the new status's result.
      const stub: GroupTournamentRun = {
        id: runId,
        groupTournamentId,
        userId,
        status,
        score,
        durationMs,
        kind,
        sliceIndex,
        roundPosition,
        playerIds,
        insertedAt,
      };
      const currentRuns = state.data.runs || [];
      const existingRunIndex = currentRuns.findIndex((item) => item.id === stub.id);

      if (existingRunIndex >= 0) {
        currentRuns[existingRunIndex] = { ...currentRuns[existingRunIndex], ...stub };
      } else {
        currentRuns.unshift({ ...stub, detailsLoaded: false });
      }

      state.data.runs = currentRuns;

      if (runId) {
        state.activeRunIdFromServer = runId;
        state.activeRunFromServerTick = (state.activeRunFromServerTick || 0) + 1;
      }
    },
    applyRunDetails: (
      state,
      { payload }: PayloadAction<{ run?: GroupTournamentRun } & Partial<GroupTournamentRun>>,
    ) => {
      const run = (payload.run || payload) as GroupTournamentRun;

      state.data = state.data || {};

      const currentRuns = state.data.runs || [];
      const nextRun: GroupTournamentRun = { ...run, detailsLoaded: true };
      const existingRunIndex = currentRuns.findIndex((item) => item.id === nextRun.id);

      if (existingRunIndex >= 0) {
        currentRuns[existingRunIndex] = { ...currentRuns[existingRunIndex], ...nextRun };
      } else {
        currentRuns.unshift(nextRun);
      }

      state.data.runs = currentRuns;
    },
    updateRun: (
      state,
      { payload }: PayloadAction<{ runId: string | number } & Record<string, unknown>>,
    ) => {
      const { runId, ...fields } = payload;

      state.data = state.data || {};

      const currentRuns = state.data.runs || [];
      const existingRunIndex = currentRuns.findIndex((item) => item.id === runId);

      if (existingRunIndex >= 0) {
        currentRuns[existingRunIndex] = { ...currentRuns[existingRunIndex], ...fields };
        state.data.runs = currentRuns;
      }
    },
    resetGroupTournament: () => initialState,
  },
});

export const { actions } = groupTournament;
export default groupTournament.reducer;
