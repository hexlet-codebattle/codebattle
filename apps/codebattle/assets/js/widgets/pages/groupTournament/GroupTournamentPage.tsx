import React from 'react';

import Loading from '@/components/Loading';
import useGroupTournamentPage from '@/utils/useGroupTournamentPage';
import EditorPanel from './EditorPanel';
import EvolutionPanel from './EvolutionPanel';
import ExternalPlatformErrorPanel from './ExternalPlatformErrorPanel';
import FullscreenGroupBattleViewer from './FullscreenGroupBattleViewer';
import Header from './Header';
import InvitationPanel from './InvitationPanel';
import MainPanel from './MainPanel';
import {
  type TournamentMeta,
  type Run,
  type GroupTournament,
  type LeaderboardEntry,
  type ExternalSetup,
  type Invite,
  type Lang,
} from './types';

// The `data`/`externalSetup`/`invite` values come from a loosely-typed Redux
// slice (`Record<string, unknown>` / `unknown`). Narrow them to the local
// domain interfaces at this integration boundary.
interface GroupTournamentPageData {
  groupTournament?: GroupTournament;
  leaderboard?: LeaderboardEntry[];
  runs?: Run[];
  langs?: Lang[];
  currentPlayer?: { lang?: string };
}

interface GroupTournamentPageProps {
  tournamentId?: number | string | null;
  tournamentName?: string;
  tournamentDescription?: string;
  tournamentTaskDescription?: string;
  tournamentMeta?: TournamentMeta | null;
}

function GroupTournamentPage({
  tournamentId,
  tournamentName,
  tournamentDescription,
  tournamentTaskDescription,
  tournamentMeta,
}: GroupTournamentPageProps) {
  const {
    status,
    invite: rawInvite,
    externalSetup: rawExternalSetup,
    requireInvitation,
    runOnExternalPlatform,
    platformError,
    data: rawData,
    runId,
    selectedRun,
    selectedRunCode,
    selectedRunLang,
    handleSelectRun,
    isAdmin,
    currentUserId: rawCurrentUserId,
    requestInviteUpdates,
    handleStartTournament,
    handleSubmitSolution,
    viewerFullscreen,
    setViewerFullscreen,
    editorFullscreen,
    setEditorFullscreen,
    activeTab: rawActiveTab,
    setActiveTab,
  } = useGroupTournamentPage(tournamentId);

  const data = rawData as GroupTournamentPageData;
  const invite = rawInvite as Invite;
  const externalSetup = rawExternalSetup as ExternalSetup | null;
  const currentUserId = rawCurrentUserId ?? undefined;
  const activeTab = rawActiveTab ?? undefined;

  if (status === 'loading') {
    return <Loading />;
  }

  if (!isAdmin && requireInvitation && status === 'waiting_participants') {
    return (
      <InvitationPanel
        name={tournamentName}
        meta={tournamentMeta}
        repoUrl={externalSetup?.repoUrl}
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
            groupTournament={data?.groupTournament}
            tournamentStatus={status}
            runId={runId}
            setRunId={handleSelectRun}
            repoUrl={externalSetup?.repoUrl}
            onAddSolution={
              runOnExternalPlatform || status === 'waiting_participants'
                ? null
                : () => setEditorFullscreen(true)
            }
            leaderboard={data?.leaderboard}
            currentUserId={currentUserId}
          />
        </div>
        <div className="col-lg-10 col-md-9 col-12 p-1 pb-4">
          <MainPanel
            status={status}
            run={selectedRun}
            description={tournamentDescription}
            taskDescription={tournamentTaskDescription}
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
