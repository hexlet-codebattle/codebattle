import { Card, ScrollArea, SegmentedControl, Select, Tabs } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMediaQuery } from '@mantine/hooks';

import { useSharedProps } from '@/shared/useSharedProps';

import { About } from '../components/About';
import { Leaderboard } from '../components/Leaderboard';
import { useTournamentStore } from '../store';
import type { Tournament } from '../types';
import type { TournamentApi } from '../useTournament';

import { ClanRankingPanel, LangsPanel, TaskAdvancedPanel, TasksRankingPanel } from './AnalyticsPanels';
import { PanelMessage } from './common';
import { LiveGamesPanel } from './LiveGamesPanel';
import { CheatersPanel, ReportsPanel } from './ModerationPanels';
import { allowedPanels, groupOf, PANEL_GROUPS, PANEL_TITLES, PanelMode, type PanelModeId } from './modes';
import { PlayerPanel } from './PlayerPanel';
import classes from './Panels.module.css';
import { PlayersMatchesPanel } from './PlayersMatchesPanel';

/** The legacy info panels (Player Panel, Players & Matches, Leaderboard, analytics, moderation) as tabs; #hash picks one. */
export function TournamentPanels({ tournament, api }: { tournament: Tournament; api: TournamentApi }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const isPlayer = useTournamentStore((state) => Boolean(state.players[me.id]));
  const finished = tournament.state === 'finished';
  const allowed = useMemo(
    () => allowedPanels({ admin: Boolean(me.is_admin), started: finished || tournament.state === 'active', finished }),
    [me.is_admin, finished, tournament.state],
  );
  const fallback: PanelModeId = finished
    ? PanelMode.leaderboard
    : isPlayer && tournament.state === 'active'
      ? PanelMode.player
      : tournament.state === 'active'
        ? PanelMode.rating
        : PanelMode.about;

  const [mode, setMode] = useState<PanelModeId | null>(() => {
    const hash = window.location.hash.slice(1) as PanelModeId;
    return hash in PANEL_TITLES ? hash : null;
  });
  const [taskId, setTaskId] = useState<number | null>(null);
  const [searchedUserId, setSearchedUserId] = useState<number | null>(null);
  const compact = useMediaQuery('(max-width: 48em)');

  // The drill-down panel only exists while a task is picked.
  const current: PanelModeId =
    mode === PanelMode.taskAdvanced ? (taskId != null ? mode : fallback) : mode && allowed.includes(mode) ? mode : fallback;

  useEffect(() => {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${current}`);
  }, [current]);

  const select = (next: PanelModeId) => {
    setMode(next);
    if (next !== PanelMode.rating) setSearchedUserId(null);
  };
  // Clicking a player in the analytics opens them in Players & Matches.
  const selectUser = (userId: number) => {
    setSearchedUserId(userId);
    setMode(PanelMode.rating);
  };

  const panel = (() => {
    switch (current) {
      case PanelMode.player:
        return <PlayerPanel tournament={tournament} api={api} />;
      case PanelMode.rating:
        return <PlayersMatchesPanel key={searchedUserId ?? 'all'} tournament={tournament} api={api} searchedUserId={searchedUserId} />;
      case PanelMode.leaderboard:
        return finished ? (
          <Leaderboard api={api} />
        ) : (
          <PanelMessage>{t('The leaderboard is published when the tournament ends. Live standings are in the ranking.')}</PanelMessage>
        );
      case PanelMode.topUsersByClan:
        return <ClanRankingPanel tournament={tournament} api={api} onSelectUser={selectUser} />;
      case PanelMode.tasksRanking:
        return (
          <TasksRankingPanel
            tournament={tournament}
            api={api}
            onSelectTask={(id) => {
              setTaskId(id);
              setMode(PanelMode.taskAdvanced);
            }}
          />
        );
      case PanelMode.langs:
        return <LangsPanel tournament={tournament} api={api} />;
      case PanelMode.taskAdvanced:
        return (
          <TaskAdvancedPanel
            tournament={tournament}
            api={api}
            taskId={taskId!}
            onBack={() => setMode(PanelMode.tasksRanking)}
            onSelectUser={selectUser}
          />
        );
      case PanelMode.live:
        return <LiveGamesPanel api={api} />;
      case PanelMode.reports:
        return <ReportsPanel api={api} />;
      case PanelMode.cheaters:
        return <CheatersPanel api={api} />;
      default:
        return <About tournament={tournament} api={api} />;
    }
  })();

  // Top-level groups this viewer has; inside a group, a segmented control picks the panel.
  const groups = PANEL_GROUPS.filter((group) => group.modes.some((value) => allowed.includes(value)));
  const group = groupOf(current);
  const subModes = group.sub ? group.modes.filter((value) => allowed.includes(value) && group.sub?.[value]) : [];

  return (
    <Card padding={0}>
      {compact ? (
        <Select
          m="sm"
          size="sm"
          data={groups.map((item) => ({ value: item.id, label: t(item.title) }))}
          value={group.id}
          onChange={(value) => {
            const next = groups.find((item) => item.id === value);
            if (next) select(next.modes.find((mode) => allowed.includes(mode))!);
          }}
          allowDeselect={false}
          aria-label={t('Panel')}
        />
      ) : (
        <Tabs
          value={group.id}
          onChange={(value) => {
            const next = groups.find((item) => item.id === value);
            if (next) select(next.modes.find((mode) => allowed.includes(mode))!);
          }}
        >
          <ScrollArea type="hover" scrollbarSize={4} offsetScrollbars="x">
            <Tabs.List px="sm" pt="xs" className={classes.tabsRow}>
              {groups.map((item) => (
                <Tabs.Tab key={item.id} value={item.id} disabled={item.id === 'player' && !isPlayer}>
                  {t(item.title)}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </ScrollArea>
        </Tabs>
      )}
      {subModes.length > 1 && (
        <SegmentedControl
          className={classes.subModes}
          size="xs"
          mx="sm"
          mt="sm"
          value={current === PanelMode.taskAdvanced ? PanelMode.tasksRanking : current}
          onChange={(value) => select(value as PanelModeId)}
          data={subModes.map((value) => ({ value, label: t(group.sub![value]!) }))}
        />
      )}
      <div style={{ padding: current === PanelMode.about ? 0 : 'var(--mantine-spacing-sm)' }}>{panel}</div>
    </Card>
  );
}
