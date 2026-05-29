import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  status: "loading", // "loading" | "active" | "finished"
  projectStatus: "loading", // "created" | "loading",
  projectLink: null, // string | null
  invite: {
    state: "loading", // "creating" | "pending" | "accepted" | "failed" | "loading"
    inviteLink: null,
  },
  requireInvitation: true,
  runOnExternalPlatform: false,
  platformError: null,
  externalSetup: null,
  solutionEvolution: [], // Array<{ id: string, status: "creating" | "finished" }>
  code: "",
  langSlug: "",
  data: {},
  activeRunIdFromServer: null,
  activeRunFromServerTick: 0,
};

const groupTournament = createSlice({
  name: "groupTournament",
  initialState,
  reducers: {
    setGroupTournamentData: (state, { payload }) => ({
      ...state,
      ...payload,
      invite: {
        ...state.invite,
        ...(payload.invite || {}),
      },
    }),
    updateGroupTournamentData: (state, { payload }) => ({
      ...state,
      ...payload,
    }),
    updateGroupTournamentStatus: (state, { payload }) => {
      state.status = payload;
    },
    mergeGroupTournament: (state, { payload }) => {
      state.data = state.data || {};
      state.data.groupTournament = {
        ...(state.data.groupTournament || {}),
        ...payload,
      };
    },
    setLeaderboard: (state, { payload }) => {
      state.data = state.data || {};
      state.data.leaderboard = payload || [];
    },
    updateInviteState: (state, { payload }) => {
      state.invite.state = payload;
    },
    updateInviteLink: (state, { payload }) => {
      state.invite.inviteLink = payload;
    },
    addSolutionEvolution: (state, { payload }) => {
      state.solutionEvolution.push(payload);
    },
    updateSolutionEvolutionStatus: (state, { payload }) => {
      const { id, status } = payload;
      const solutionEvolutionItem = state.solutionEvolution.find((item) => item.id === id);
      if (solutionEvolutionItem) {
        solutionEvolutionItem.status = status;
      }
    },
    updateCode: (state, { payload }) => {
      state.code = payload;
    },
    updateLangSlug: (state, { payload }) => {
      state.langSlug = payload;
    },
    setData: (state, { payload }) => {
      // Merge so a later-arriving REST snapshot can't wipe fields that only
      // the channel push includes (notably `leaderboard`). Both sources race
      // on initial page load.
      state.data = { ...(state.data || {}), ...(payload || {}) };
    },
    setActiveRunIdFromServer: (state, { payload }) => {
      state.activeRunIdFromServer = payload;
      state.activeRunFromServerTick = (state.activeRunFromServerTick || 0) + 1;
    },
    applyRunStub: (state, { payload }) => {
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
      const stub = {
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
    applyRunDetails: (state, { payload }) => {
      const run = payload.run || payload;

      state.data = state.data || {};

      const currentRuns = state.data.runs || [];
      const nextRun = { ...run, detailsLoaded: true };
      const existingRunIndex = currentRuns.findIndex((item) => item.id === nextRun.id);

      if (existingRunIndex >= 0) {
        currentRuns[existingRunIndex] = { ...currentRuns[existingRunIndex], ...nextRun };
      } else {
        currentRuns.unshift(nextRun);
      }

      state.data.runs = currentRuns;
    },
    updateRun: (state, { payload }) => {
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
