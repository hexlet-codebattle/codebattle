import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Loading from "@/components/Loading";
import { load, requestInviteUpdate } from "@/middlewares/GroupTournament";
import useGroupBattleRun from "@/utils/useGroupBattleRun";
import useGroupTournamentChannel from "@/utils/useGroupTournamentChannel";
import * as selectors from "../../selectors";
import AdminExternalSetupPanel from "./AdminExternalSetupPanel";
import EditorPanel from "./EditorPanel";
import EvolutionPanel from "./EvolutionPanel";
import ExternalPlatformErrorPanel from "./ExternalPlatformErrorPanel";
import FullscreenGroupBattleViewer from "./FullscreenGroupBattleViewer";
import Header from "./Header";
import InvitationPanel from "./InvitationPanel";
import LogPanel from "./LogPanel";
import MainPanel from "./MainPanel";

function GroupTournamentPage({ tournamentId, tournamentName, tournamentDescription }) {
  const dispatch = useDispatch();

  const [viewerFullscreen, setViewerFullscreen] = useState(false);

  useGroupTournamentChannel(tournamentId);

  const {
    status,
    invite,
    externalSetup,
    requireInvitation,
    platformError,
    logs,
    data,
  } = useSelector(selectors.groupTournamentSelector);

  const {
    runId,
    selectedRun,
    setSelectedRunId,
    selectedRunCode,
    selectedRunLang,
  } = useGroupBattleRun(data)

  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);

  const requestInviteUpdates = () => {
    requestInviteUpdate()(dispatch);
  };

  useEffect(() => {
    if (tournamentId) {
      load(tournamentId)(dispatch);
    }
  }, [tournamentId, dispatch]);

  if (status === "loading") {
    return <Loading />;
  }

  if (!isAdmin && requireInvitation && invite.state !== "accepted") {
    return <InvitationPanel
      invite={invite}
      requestInviteUpdates={requestInviteUpdates}
    />
  }

  if (platformError) {
    return <ExternalPlatformErrorPanel
      requestInviteUpdates={requestInviteUpdates}
    />
  }

  return (
    <>
      <div className="row">
        <Header name={tournamentName} status={status} />
      </div>
      {isAdmin && externalSetup && (
        <div className="row mt-2">
          <AdminExternalSetupPanel externalSetup={externalSetup} />
        </div>
      )}
      <div className="row mt-3 h-100">
        <div className="col-lg-3 col-md-3 col-12 p-1 pb-4">
          <EvolutionPanel
            items={data?.runs}
            tournamentStatus={status}
            runId={runId}
            setRunId={setSelectedRunId}
            repoUrl={externalSetup?.repoUrl}
          />
        </div>
        <div className="col-lg-5 col-md-5 col-12 p-1 pb-4">
          <MainPanel
            status={status}
            run={selectedRun}
            description={tournamentDescription}
            setViewerFullscreen={setViewerFullscreen}
          />
        </div>
        <div className="col-lg-4 col-md-4 col-12 p-1 pb-4">
          <EditorPanel text={selectedRunCode} lang={selectedRunLang} />
          <LogPanel logs={logs} />
        </div>
      </div>
      <FullscreenGroupBattleViewer viewerFullscreen={viewerFullscreen} selectedRun={selectedRun} />
    </>
  );
}

export default GroupTournamentPage;
