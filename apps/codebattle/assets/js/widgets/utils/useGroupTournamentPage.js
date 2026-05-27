import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  load,
  requestInviteUpdate,
  startGroupTournament,
  submitSolution,
} from "@/middlewares/GroupTournament";
import useGroupBattleRun from "@/utils/useGroupBattleRun";
import useGroupTournamentChannel from "@/utils/useGroupTournamentChannel";
import * as selectors from "../selectors";

const useGroupTournamentPage = (tournamentId) => {
  const dispatch = useDispatch();

  const [viewerFullscreen, setViewerFullscreen] = useState(false);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  useGroupTournamentChannel(tournamentId);

  const {
    status,
    invite,
    externalSetup,
    requireInvitation,
    runOnExternalPlatform,
    platformError,
    data,
  } = useSelector(selectors.groupTournamentSelector);

  const { runId, selectedRun, setSelectedRunId, selectedRunCode, selectedRunLang } =
    useGroupBattleRun(data);

  const handleSelectRun = (id) => {
    setSelectedRunId(id);
    setActiveTab("run");
  };

  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const currentUserId = useSelector(selectors.currentUserIdSelector);

  const requestInviteUpdates = () => {
    requestInviteUpdate()(dispatch);
  };

  const handleStartTournament = () => {
    startGroupTournament()(dispatch);
  };

  const handleSubmitSolution = (solution, lang) => submitSolution(solution, lang)(dispatch);

  useEffect(() => {
    if (tournamentId) {
      load(tournamentId)(dispatch);
    }
  }, [tournamentId, dispatch]);

  return {
    status,
    invite,
    externalSetup,
    requireInvitation,
    runOnExternalPlatform,
    platformError,
    data,
    runId,
    selectedRun,
    selectedRunCode,
    selectedRunLang,
    handleSelectRun,
    isAdmin,
    currentUserId,
    requestInviteUpdates,
    handleStartTournament,
    handleSubmitSolution,
    viewerFullscreen,
    setViewerFullscreen,
    editorFullscreen,
    setEditorFullscreen,
    activeTab,
    setActiveTab,
  };
};

export default useGroupTournamentPage;
