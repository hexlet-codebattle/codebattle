import React, { useCallback } from 'react';

import NiceModal from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button, Flex, Group, Text } from '@mantine/core';
import isEmpty from 'lodash/isEmpty';

import i18n from '../../../i18n';
import GameLevelBadge from '../../components/GameLevelBadge';
import ModalCodes from '../../config/modalCodes';
import PageNames from '../../config/pageNames';
import useTaskDescriptionParams from '../../utils/useTaskDescriptionParams';

import ContributorsList from './ContributorsList';
import TaskDescriptionMarkdown from './TaskDescriptionMarkdown';
import TaskLanguagesSelection from './TaskLanguageSelection';

export interface GameTask {
  name: string;
  level: string;
  examples?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  tags?: string[];
  origin?: string;
  type?: string;
  [key: string]: unknown;
}

// Bootstrap h1–h5 size helpers used for task-description font-zoom feature.
// Kept as Bootstrap classes rather than inlined so that future CSS overrides
// (e.g. responsive cb-* shrinks) continue to work without specificity fights.
const TASK_SIZE_CLASS: Record<number, string> = {
  1: 'h5',
  2: 'h4',
  3: 'h3',
  4: 'h2',
};
const getTaskSizeClass = (taskSize: number) =>
  taskSize >= 5 ? 'h1' : (TASK_SIZE_CLASS[taskSize] ?? '');

const renderTaskLink = (task: GameTask) => {
  const link = `https://github.com/hexlet-codebattle/tasks/tree/master/tasks/${task.level}/${task.tags?.[0]}/${task.name}.toml`;

  return (
    <Text component="a" href={link} className="cb-text" display="inline-block">
      <FontAwesomeIcon icon="github" style={{ marginRight: 'var(--mantine-spacing-xs)' }} />
      link
    </Text>
  );
};

export interface TaskAssignmentProps {
  task: GameTask;
  taskLanguage: string;
  taskSize?: number;
  handleSetLanguage: (lang: string) => () => void;
  changeTaskDescriptionSizes?: (size: number) => void;
  hideContribution?: boolean;
  hideContent?: boolean;
  hidingControls?: boolean;
  fullSize?: boolean;
}

function TaskAssignment({
  task,
  taskLanguage,
  taskSize = 0,
  handleSetLanguage,
  changeTaskDescriptionSizes,
  hideContribution = false,
  hideContent = false,
  hidingControls = false,
  fullSize = false,
}: TaskAssignmentProps) {
  const [avaibleLanguages, displayLanguage, description] = useTaskDescriptionParams(
    task,
    taskLanguage,
  );
  const handleTaskSizeIncrease = useCallback(() => {
    changeTaskDescriptionSizes?.(taskSize + 1);
  }, [taskSize, changeTaskDescriptionSizes]);

  const handleTaskSizeDecrease = useCallback(() => {
    changeTaskDescriptionSizes?.(taskSize - 1);
  }, [taskSize, changeTaskDescriptionSizes]);
  const handleOpenFullSizeTaskDescription = useCallback(() => {
    NiceModal.show(ModalCodes.taskDescriptionModal, {
      pageName: PageNames.game,
    });
  }, []);

  if (isEmpty(task)) {
    return null;
  }

  // Bootstrap heading-size classes (h1–h5) kept intentionally for the
  // task-zoom feature — inlining font-size would break responsive cb-* overrides.
  const taskSizeClass = getTaskSizeClass(taskSize);
  const cardClassNames = ['cb-card', taskSizeClass].filter(Boolean).join(' ');

  if (hideContent) {
    return (
      <Box className={cardClassNames}>
        <Flex justify="center" align="center" h="100%">
          <span>{i18n.t('Only for Premium subscribers')}</span>
        </Flex>
      </Box>
    );
  }

  return (
    <Box className={cardClassNames}>
      <Box px="md" py="md" h="100%" data-guide-id={!fullSize ? 'Task' : undefined}>
        <Flex align="flex-start" direction={{ base: 'column', sm: 'row' }} justify="space-between">
          <Group component="h6" align="center" gap="xs" mb={0} mt={0}>
            <GameLevelBadge level={task.level} />
            <Text span ml="sm">
              {i18n.t('Task: ')}
            </Text>
            <Text span ml="sm" c="dimmed">
              {task.name}
            </Text>
          </Group>
          <Group align="center">
            <TaskLanguagesSelection
              handleSetLanguage={handleSetLanguage}
              avaibleLanguages={avaibleLanguages}
              displayLanguage={displayLanguage}
            />

            {!fullSize && (
              <Button
                type="button"
                variant="outline"
                color="cbSecondary"
                size="sm"
                radius="md"
                ml="sm"
                style={{ whiteSpace: 'nowrap' }}
                onClick={handleOpenFullSizeTaskDescription}
              >
                <FontAwesomeIcon
                  icon="expand"
                  style={{ marginRight: 'var(--mantine-spacing-sm)' }}
                />
                {i18n.t('Expand')}
              </Button>
            )}
            {changeTaskDescriptionSizes && !hidingControls && (
              <Group
                align="center"
                ml="sm"
                mr="auto"
                role="group"
                aria-label={i18n.t('Editor size controls')}
              >
                <Button
                  type="button"
                  size="sm"
                  variant="light"
                  onClick={handleTaskSizeDecrease}
                  style={{
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }}
                >
                  -
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="light"
                  mr="sm"
                  onClick={handleTaskSizeIncrease}
                  style={{
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderLeft: '1px solid var(--mantine-color-default-border)',
                  }}
                >
                  +
                </Button>
              </Group>
            )}
          </Group>
        </Flex>
        <Flex direction="column" style={{ userSelect: 'none' }}>
          <Box mb={0} h="100%" style={{ overflow: 'auto', userSelect: 'none' }}>
            <TaskDescriptionMarkdown description={description} />
          </Box>
        </Flex>
        {task.origin === 'github' && !hideContribution && (
          <>
            <ContributorsList task={task} />
            <Flex
              align="flex-end"
              direction={{ base: 'column', sm: 'row' }}
              justify="space-between"
            >
              <Text component="h6" size="sm" fs="italic">
                <Text span mr="sm">
                  {i18n.t('Found a mistake? Have something to add? Pull Requests are welcome: ')}
                </Text>
                {renderTaskLink(task)}
              </Text>
            </Flex>
          </>
        )}
      </Box>
    </Box>
  );
}

export default TaskAssignment;
