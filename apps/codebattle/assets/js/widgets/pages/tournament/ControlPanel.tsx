import React, { memo, useCallback, useContext } from 'react';

import { Flex, NativeSelect } from '@mantine/core';
import cn from 'classnames';
import i18next from 'i18next';

import CustomEventStylesContext from '../../components/CustomEventStylesContext';

// %{"type" => "top_users_by_clan_ranking"} ->
// %{"type" => "tasks_ranking"} ->
// %{"type" => "task_duration_distribution", "task_id" => task_id} ->
// %{"type" => "clans_bubble_distribution"} ->
// %{"type" => "top_user_by_task_ranking", "task_id" => task_id} ->
//
export const PanelModeCodes = {
  ratingMode: 'ratingMode',
  reportsMode: 'reportsMode',
  cheatersMode: 'cheatersMode',
  leaderboardMode: 'leaderboardMode',
  playerMode: 'playerMode',
  topUserByClansMode: 'top_users_by_clan_ranking',
  taskRatingMode: 'tasks_ranking',
  clansBubbleDistributionMode: 'clans_bubble_distribution',
  taskRatingAdvanced: 'task_rating_advanced',
  taskDurationDistributionMode: 'task_duration_distribution',
  topUserByTasksMode: 'top_user_by_task_ranking',
};

export const mapPanelModeToTitle = {
  [PanelModeCodes.ratingMode]: i18next.t('Players & Matches'),
  [PanelModeCodes.reportsMode]: i18next.t('Reports Panel'),
  [PanelModeCodes.cheatersMode]: i18next.t('Cheaters Panel'),
  [PanelModeCodes.playerMode]: i18next.t('Player Panel'),
  [PanelModeCodes.leaderboardMode]: i18next.t('Leaderboard'),
  [PanelModeCodes.topUserByClansMode]: i18next.t('Top users by clan ranking'),
  [PanelModeCodes.taskRatingMode]: i18next.t('Tasks ranking'),
  [PanelModeCodes.clansBubbleDistributionMode]: i18next.t('Clans bubble distribution'),
  [PanelModeCodes.taskRatingAdvanced]: i18next.t('Duration distribution and top users by task'),
  [PanelModeCodes.taskDurationDistributionMode]: i18next.t('task duration distribution'),
  [PanelModeCodes.topUserByTasksMode]: i18next.t('Top user by task ranking'),
};

interface PanelMode {
  panel: string;
}

interface ControlPanelProps {
  allowedPanelModes: string[];
  isPlayer?: boolean;
  leftContent?: React.ReactNode;
  panelMode: PanelMode;
  setPanelMode: (mode: PanelMode) => void;
}

function ControlPanel({
  allowedPanelModes,
  isPlayer,
  leftContent = null,
  panelMode,
  setPanelMode,
}: ControlPanelProps) {
  const hasCustomEventStyles = useContext(CustomEventStylesContext);
  const onChangePanelMode = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPanelMode({ panel: e.target.value });
    },
    [setPanelMode],
  );

  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      justify="space-between"
      align="stretch"
      gap="xs"
      className="cb-tournament-control-panel"
    >
      <Flex align="stretch" flex={1} style={{ minWidth: 0 }}>
        {leftContent}
      </Flex>
      <Flex
        align="center"
        justify="flex-end"
        className={cn(hasCustomEventStyles && 'cb-custom-event-text')}
      >
        <NativeSelect
          key="select_panel_mode"
          value={panelMode.panel}
          onChange={onChangePanelMode}
          radius="md"
          data={allowedPanelModes
            .filter(
              (mode) =>
                ![
                  PanelModeCodes.taskRatingAdvanced,
                  PanelModeCodes.taskDurationDistributionMode,
                  PanelModeCodes.topUserByTasksMode,
                ].includes(mode) || mode === panelMode.panel,
            )
            .map((mode) => ({
              value: mode,
              label: mapPanelModeToTitle[mode] || mode,
              disabled: mode === PanelModeCodes.playerMode && !isPlayer,
            }))}
        />
      </Flex>
    </Flex>
  );
}

export default memo(ControlPanel);
