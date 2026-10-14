import { ActionIcon, Anchor, Badge, Code, ScrollArea, Table, Tabs, Text, Tooltip } from '@mantine/core';
import { IconMaximize } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Markdown } from '@/shared/Markdown';

import { Leaderboard } from './Leaderboard';
import { hasViewer, RunViewer } from './RunViewer';
import type { ExternalSetup, LeaderboardEntry, Run } from './types';
import classes from './GroupTournament.module.css';

export type MainTab = 'description' | 'task_description' | 'run' | 'leaderboard' | 'settings';

interface TabsInput {
  status: string;
  hasRun: boolean;
  hasTaskDescription: boolean;
  hasLeaderboard: boolean;
  hasSettings: boolean;
}

/** Tabs this viewer has; waiting for the start, only the descriptions. */
export function availableTabs({ status, hasTaskDescription, hasLeaderboard, hasSettings }: TabsInput): MainTab[] {
  const waiting = status === 'waiting_participants';
  const tabs: MainTab[] = ['description'];
  if (hasTaskDescription) tabs.push('task_description');
  if (!waiting) tabs.push('run');
  if (!waiting && hasLeaderboard) tabs.push('leaderboard');
  if (!waiting && hasSettings) tabs.push('settings');
  return tabs;
}

/** Leaderboard once finished, the run while playing, else the description. */
export function defaultTab(input: TabsInput): MainTab {
  const tabs = availableTabs(input);
  const preferred: MainTab = input.status === 'finished' ? 'leaderboard' : input.status === 'active' && input.hasRun ? 'run' : 'description';
  return tabs.includes(preferred) ? preferred : 'description';
}

function DescriptionView({ text }: { text: string | null | undefined }) {
  const { t } = useTranslation();
  return text ? (
    <Markdown>{text}</Markdown>
  ) : (
    <Text size="sm" c="dimmed">
      {t('No description provided for this tournament.')}
    </Text>
  );
}

/** Moderators: the player's external repo / role / secret provisioning. */
function ExternalSetupView({ setup }: { setup: ExternalSetup }) {
  const rows: [string, ReactNode][] = [
    ['state', setup.state],
    ['repo_state', setup.repo_state],
    ['role_state', setup.role_state],
    ['secret_state', setup.secret_state],
    ['repo_slug', setup.repo_slug || 'n/a'],
    [
      'repo_url',
      setup.repo_url ? (
        <Anchor key="repo_url" href={setup.repo_url} target="_blank" rel="noreferrer" size="sm">
          {setup.repo_url}
        </Anchor>
      ) : (
        'n/a'
      ),
    ],
  ];

  return (
    <>
      <Table verticalSpacing={4} fz="sm" maw={640} withRowBorders={false}>
        <Table.Tbody>
          {rows.map(([field, value]) => (
            <Table.Tr key={field}>
              <Table.Td w={140} ff="monospace" c="dimmed">
                {field}
              </Table.Td>
              <Table.Td>{value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {setup.last_error && Object.keys(setup.last_error).length > 0 && (
        <Code block mt="sm" c="var(--cb-danger)">
          {JSON.stringify(setup.last_error, null, 2)}
        </Code>
      )}
    </>
  );
}

interface MainPanelProps extends TabsInput {
  tab: MainTab;
  onTab: (tab: MainTab) => void;
  description: string | null;
  taskDescription: string | null;
  run: Run | null;
  leaderboard: LeaderboardEntry[];
  roundsCount: number;
  externalSetup: ExternalSetup | null;
  userId: number;
  onRunPlace: (runId: number, place: number | null) => void;
  onFullscreen: () => void;
}

/** Description · Task · Run Viewer · Leaderboard · External Setup. */
export function MainPanel(props: MainPanelProps) {
  const { t } = useTranslation();
  const { tab, onTab, run, externalSetup } = props;
  const tabs = availableTabs(props);
  const labels: Record<MainTab, ReactNode> = {
    description: t('Description'),
    task_description: t('Task'),
    run: t('Run Viewer'),
    leaderboard: t('Leaderboard'),
    settings: (
      <>
        {t('External Setup')}
        {externalSetup?.state && (
          <Badge size="xs" ml={6} variant="light" color={externalSetup.state === 'ready' ? 'green' : 'yellow'}>
            {externalSetup.state}
          </Badge>
        )}
      </>
    ),
  };

  const content = (() => {
    switch (tab) {
      case 'task_description':
        return <DescriptionView text={props.taskDescription} />;
      case 'run':
        return <RunViewer run={run} userId={props.userId} onPlace={props.onRunPlace} />;
      case 'leaderboard':
        return <Leaderboard leaderboard={props.leaderboard} roundsCount={props.roundsCount} userId={props.userId} />;
      case 'settings':
        return externalSetup ? <ExternalSetupView setup={externalSetup} /> : null;
      default:
        return <DescriptionView text={props.description} />;
    }
  })();

  return (
    <div className={classes.panel}>
      <div className={classes.tabsBar}>
        <ScrollArea type="hover" scrollbarSize={4} offsetScrollbars="x" style={{ flex: 1, minWidth: 0 }}>
          <Tabs value={tab} onChange={(value) => value && onTab(value as MainTab)}>
            <Tabs.List className={classes.tabsList}>
              {tabs.map((value) => (
                <Tabs.Tab key={value} value={value}>
                  {labels[value]}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </ScrollArea>
        {tab === 'run' && hasViewer(run) && (
          <Tooltip label={t('Fullscreen')}>
            <ActionIcon variant="subtle" color="gray" onClick={props.onFullscreen} aria-label={t('Fullscreen')}>
              <IconMaximize size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </div>
      <div className={classes.panelBody} data-tab={tab}>
        {content}
      </div>
    </div>
  );
}
