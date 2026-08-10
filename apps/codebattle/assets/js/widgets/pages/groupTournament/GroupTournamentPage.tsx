import React from 'react';
import { Box, Flex } from '@mantine/core';

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
      <Box>
        <Header name={tournamentName} status={status} groupTournament={data?.groupTournament} />
      </Box>
      <Flex mt="md" h="100%" wrap="wrap">
        <Box w={{ base: '100%', md: '25%', lg: '16.6667%' }} p="xs" pb="lg">
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
        </Box>
        <Box w={{ base: '100%', md: '75%', lg: '83.3333%' }} p="xs" pb="lg">
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
        </Box>
      </Flex>
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
