import React from "react";

import Loading from "@/components/Loading";
import useGroupTournamentPage from "@/utils/useGroupTournamentPage";
import EditorPanel from "./EditorPanel";
import EvolutionPanel from "./EvolutionPanel";
import ExternalPlatformErrorPanel from "./ExternalPlatformErrorPanel";
import FullscreenGroupBattleViewer from "./FullscreenGroupBattleViewer";
import Header from "./Header";
import InvitationPanel from "./InvitationPanel";
import MainPanel from "./MainPanel";

function GroupTournamentPage({
  tournamentId,
  tournamentName,
  tournamentDescription,
  tournamentMeta,
}) {
  const {
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
  } = useGroupTournamentPage(tournamentId);

  if (status === "loading") {
    return <Loading />;
  }

  if (!isAdmin && requireInvitation && status === "waiting_participants") {
    return (
      <InvitationPanel
        name={tournamentName}
        meta={tournamentMeta}
        invite={invite}
        onStart={handleStartTournament}
      />
    );
  }

  if (platformError) {
    return <ExternalPlatformErrorPanel requestInviteUpdates={requestInviteUpdates} />;
  }

  return (
    <>
      <div className="row">
        <Header name={tournamentName} status={status} groupTournament={data?.groupTournament} />
      </div>
      <div className="row mt-3 h-100">
        <div className="col-lg-2 col-md-3 col-12 p-1 pb-4">
          <EvolutionPanel
            items={data?.runs}
            tournamentStatus={status}
            runId={runId}
            setRunId={handleSelectRun}
            repoUrl={externalSetup?.repoUrl}
            onAddSolution={runOnExternalPlatform ? null : () => setEditorFullscreen(true)}
            leaderboard={data?.leaderboard}
            currentUserId={currentUserId}
          />
        </div>
        <div className="col-lg-10 col-md-9 col-12 p-1 pb-4">
          <MainPanel
            status={status}
            run={selectedRun}
            description={tournamentDescription}
            setViewerFullscreen={setViewerFullscreen}
            leaderboard={data?.leaderboard}
            roundsCount={data?.groupTournament?.roundsCount}
            currentRoundPosition={data?.groupTournament?.currentRoundPosition}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            externalSetup={externalSetup}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </div>
      {!runOnExternalPlatform && (
        <EditorPanel
          inlineHidden
          text={selectedRunCode}
          lang={selectedRunLang}
          editorFullscreen={editorFullscreen}
          setEditorFullscreen={setEditorFullscreen}
          editable
          onSubmit={handleSubmitSolution}
          langs={data?.langs}
          currentLang={data?.currentPlayer?.lang || selectedRunLang}
        />
      )}
      <FullscreenGroupBattleViewer
        viewerFullscreen={viewerFullscreen}
        selectedRun={selectedRun}
        setViewerFullscreen={setViewerFullscreen}
      />
    </>
  );
}

export default GroupTournamentPage;
