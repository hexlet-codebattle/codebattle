import { Head } from '@inertiajs/react';
import { Alert, Button, Card, Center, Loader, Stack, Text } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InvitationPanel, PlatformErrorPanel } from '@/features/groupTournament/Gates';
import { Header } from '@/features/groupTournament/Header';
import { defaultTab, MainPanel, availableTabs, type MainTab } from '@/features/groupTournament/MainPanel';
import { RunHistory } from '@/features/groupTournament/RunHistory';
import { FullscreenViewer } from '@/features/groupTournament/RunViewer';
import { SolutionEditor } from '@/features/groupTournament/SolutionEditor';
import type { TournamentMeta } from '@/features/groupTournament/types';
import { useGroupTournament } from '@/features/groupTournament/useGroupTournament';
import { solutionForRun } from '@/features/groupTournament/utils';
import classes from '@/features/groupTournament/GroupTournament.module.css';
import { AppLayout } from '@/layout/AppLayout';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from GroupTournamentController.show.
interface GroupTournamentProps {
  group_tournament_id: number;
  name: string;
  description: string | null;
  task_description: string | null;
  meta: TournamentMeta;
}

export default function GroupTournament() {
  const { t } = useTranslation();
  const { current_user: me, group_tournament_id: id, name, description, task_description: taskDescription, meta } = useSharedProps<GroupTournamentProps>();
  const api = useGroupTournament(id);
  const isAdmin = Boolean(me.is_admin);
  const [tab, setTab] = useState<MainTab | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const tabsInput = {
    status: api.status,
    hasRun: api.selectedRun != null,
    hasTaskDescription: Boolean(taskDescription),
    hasLeaderboard: api.leaderboard.length > 0 && api.tournament?.rounds_count != null,
    hasSettings: (isAdmin || api.canModerate) && api.externalSetup != null,
  };
  const currentTab = tab && availableTabs(tabsInput).includes(tab) ? tab : defaultTab(tabsInput);

  const solution = useMemo(() => solutionForRun(api.selectedRun, api.solutionHistory), [api.selectedRun, api.solutionHistory]);

  const title = <Head title={name || t('Group Tournament')} />;

  if (api.status === 'loading') {
    return (
      <AppLayout wide>
        {title}
        {api.channelStatus === 'error' ? (
          <Card maw={520} mx="auto" mt="xl" padding="xl">
            <Stack align="center" gap="sm">
              <IconLock size={40} stroke={1.4} />
              <Text ta="center">{t('Could not connect to the tournament')}</Text>
              <Button variant="default" onClick={() => window.location.reload()}>
                {t('Retry')}
              </Button>
            </Stack>
          </Card>
        ) : (
          <Center py={80}>
            <Loader />
          </Center>
        )}
      </AppLayout>
    );
  }

  if (!isAdmin && api.requireInvitation && api.status === 'waiting_participants') {
    return (
      <AppLayout>
        {title}
        <InvitationPanel name={name} meta={meta ?? {}} repoUrl={api.externalSetup?.repo_url} invite={api.invite} onStart={api.startTournament} />
      </AppLayout>
    );
  }

  if (api.platformError) {
    return (
      <AppLayout>
        {title}
        <PlatformErrorPanel onRetry={api.requestInviteUpdate} />
      </AppLayout>
    );
  }

  const canEdit = !api.runOnExternalPlatform;

  return (
    <AppLayout wide>
      {title}
      {api.channelStatus !== 'joined' && (
        <Alert color="yellow" p="xs" mb="sm">
          {t('Reconnecting…')}
        </Alert>
      )}

      <Header name={name} status={api.status} tournament={api.tournament} isAdmin={isAdmin} />

      <div className={classes.layout}>
        <RunHistory
          status={api.status}
          tournament={api.tournament}
          runs={api.runs}
          selectedRunId={api.selectedRun?.id ?? null}
          onSelect={(runId) => {
            api.selectRun(runId);
            setTab('run');
          }}
          repoUrl={api.externalSetup?.repo_url}
          onAddSolution={canEdit ? () => setEditorOpen(true) : null}
          leaderboard={api.leaderboard}
          userId={me.id}
        />
        <MainPanel
          {...tabsInput}
          tab={currentTab}
          onTab={setTab}
          description={description}
          taskDescription={taskDescription}
          run={api.selectedRun}
          leaderboard={api.leaderboard}
          roundsCount={api.tournament?.rounds_count ?? 0}
          externalSetup={api.externalSetup}
          userId={me.id}
          onRunPlace={api.setRunPlace}
          onFullscreen={() => setViewerOpen(true)}
        />
      </div>

      {canEdit && (
        <SolutionEditor
          opened={editorOpen}
          onClose={() => setEditorOpen(false)}
          code={solution?.solution ?? ''}
          lang={solution?.lang ?? api.playerLang}
          langs={api.langs}
          onSubmit={api.submitSolution}
          onSubmitted={() => {
            setEditorOpen(false);
            setTab('run');
          }}
        />
      )}
      <FullscreenViewer opened={viewerOpen} onClose={() => setViewerOpen(false)} run={api.selectedRun} userId={me.id} onPlace={api.setRunPlace} />
    </AppLayout>
  );
}
