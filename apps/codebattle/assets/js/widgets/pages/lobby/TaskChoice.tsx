import React, { useState, useEffect, memo } from 'react';

import { faShuffle, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { getPageProp } from '@/inertia/pageProps';
import { camelizeKeys } from 'humps';
import difference from 'lodash/difference';
import get from 'lodash/get';
import groupBy from 'lodash/groupBy';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import mapValues from 'lodash/mapValues';
import omitBy from 'lodash/omitBy';
import uniqBy from 'lodash/uniqBy';
import { useDispatch, useSelector } from 'react-redux';
import Select, { createFilter } from 'react-select';

import i18n from '../../../i18n';
import * as selectors from '../../selectors';
import { actions, type AppDispatch } from '../../slices';

const taskTags = getPageProp<string[]>('task_tags', []);

interface Task {
  id: number | null;
  name?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  level?: string;
  origin?: string;
  creatorId?: number;
  tags?: string[];
  [key: string]: unknown;
}

const groupTasksByLevelByTags = (allTasks: Task[], allTags: string[]) => {
  const [restTag, ...popularTags] = allTags.slice().reverse();

  const groupTasksByTags = (tasks: Task[]) => {
    const tasksByPopularTags = popularTags.reduce<Record<string, Task[]>>(
      (acc, tag) => ({
        ...acc,
        [tag]: tasks.filter(({ tags }) => tags?.includes(tag)),
      }),
      {},
    );

    const restTasks = tasks.filter(
      ({ tags }) => isEmpty(tags) || !isEmpty(difference(tags, popularTags)),
    );

    const tasksByTags = omitBy({ ...tasksByPopularTags, [restTag as string]: restTasks }, isEmpty);

    return {
      ...tasksByTags,
      all: tasks,
      tags: Object.keys(tasksByTags),
    };
  };

  const tasksByLevel = groupBy(allTasks, 'level');

  return mapValues(tasksByLevel, groupTasksByTags);
};

interface TaskSelectProps {
  value: Task;
  onChange: (task: Task) => void;
  options: Task[];
}

function TaskSelect({ value, onChange, options }: TaskSelectProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    fetch(`/api/v1/user/${currentUserId}/stats`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        setAvatarUrl(data.user.avatar_url);
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
  }, [currentUserId, dispatch]);

  const taskOriginToIcon: Record<string, { icon: unknown; transform?: string }> = {
    user: { icon: faUser },
    github: { icon: ['fab', 'github'], transform: 'down-1' },
    random: { icon: faShuffle, transform: 'down-1' },
  };

  const getLocalizedDescription = (task: Task) => {
    const description =
      i18n.language === 'ru'
        ? task.descriptionRu || task.descriptionEn
        : task.descriptionEn || task.descriptionRu;

    return description
      ?.split('\n')
      .map((line) => line.replace(/^#+\s*/, '').trim())
      .find(Boolean);
  };

  const renderOptionLabel = (task: Task) => {
    const origin = taskOriginToIcon[task.origin ?? 'random'] ?? taskOriginToIcon.random;
    const description = getLocalizedDescription(task);
    const title = description || task.name;

    return (
      <div className="d-flex align-items-center">
        {task.creatorId === currentUserId ? (
          <img
            className="img-fluid"
            style={{ maxHeight: '24px', width: '16px' }}
            src={avatarUrl}
            alt="User avatar"
          />
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <FontAwesomeIcon icon={origin.icon as any} transform={origin.transform} />
        )}
        <span className="text-truncate ml-1" lang={i18n.language}>
          {title}
        </span>
      </div>
    );
  };

  return (
    <Select<Task>
      /* eslint-disable @typescript-eslint/no-explicit-any */
      styles={{
        menu: (base: any) => ({
          ...base,
          backgroundColor: '#1c1c24',
        }),
        container: (base: any) => ({
          ...base,
          backgroundColor: '#1c1c24',
          color: 'white',
          borderColor: '#dc3545',
          ':hover': {
            ...base[':hover'],
            cursor: 'pointer',
            borderColor: '#e04d5b',
          },
        }),
        indicatorSeparator: (base: any) => ({
          ...base,
          backgroundColor: '#dc3545',
          ':hover': {
            ...base[':hover'],
            cursor: 'pointer',
            backgroundColor: '#e04d5b',
          },
        }),
        dropdownIndicator: (base: any) => ({
          ...base,
          color: '#dc3545',
          ':hover': {
            ...base[':hover'],
            cursor: 'pointer',
            color: '#e04d5b',
          },
        }),
        control: (base: any) => ({
          ...base,
          backgroundColor: '#1c1c24',
          color: 'white',
          borderColor: '#dc3545',
          ':hover': {
            ...base[':hover'],
            cursor: 'pointer',
            borderColor: '#e04d5b',
          },
        }),
        singleValue: (base: any) => ({
          ...base,
          backgroundColor: '#1c1c24',
          color: 'white',
        }),
        option: (base: any) => ({
          ...base,
          backgroundColor: '#1c1c24',
          color: 'white',
          ':hover': {
            ...base[':hover'],
            cursor: 'pointer',
            color: '#eaffff',
            backgroundColor: '#2a2a35',
          },
        }),
      }}
      /* eslint-enable @typescript-eslint/no-explicit-any */
      className="w-100"
      value={value}
      onChange={(task) => onChange(task as Task)}
      options={options}
      getOptionLabel={(task) => task.name ?? ''}
      formatOptionLabel={renderOptionLabel}
      getOptionValue={(task) => String(task.id)}
      filterOption={createFilter({
        stringify: (option) =>
          [option.data.name, getLocalizedDescription(option.data)].filter(Boolean).join(' '),
      })}
    />
  );
}

interface TagButtonGroupProps {
  tags: string[];
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

function TagButtonGroup({ tags, value, onChange, disabled }: TagButtonGroupProps) {
  const getTagClassName = (tag: string) => {
    const isTagMarked = value.includes(tag);
    return cn('btn btn-sm mr-1 mb-1 mb-sm-0 rounded-lg text-nowrap', {
      'bg-orange text-white': isTagMarked,
      'tag-btn-outline-orange': !isTagMarked,
    });
  };

  const toggleTagButton = (tag: string) => {
    const newValue = value.includes(tag) ? value.filter((item) => item !== tag) : value.concat(tag);
    onChange(newValue);
  };

  return (
    <div className="d-flex flex-wrap border border-danger pt-2 px-2 pb-1 pb-sm-2 rounded-lg">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={getTagClassName(tag)}
          onClick={() => toggleTagButton(tag)}
          disabled={disabled}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

interface GroupedTasksByLevel {
  all: Task[];
  tags: string[];
  [tag: string]: Task[] | string[];
}

interface TaskChoiceProps {
  chosenTask: Task;
  setChosenTask: (task: Task) => void;
  chosenTags: string[];
  setChosenTags: (tags: string[]) => void;
  level: string;
}

const TaskChoice = memo(
  ({ chosenTask, setChosenTask, chosenTags, setChosenTags, level }: TaskChoiceProps) => {
    const dispatch = useDispatch<AppDispatch>();
    const [groupedTasks, setGroupedTasks] = useState<Record<string, GroupedTasksByLevel>>({});

    useEffect(() => {
      fetch('/api/v1/tasks')
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }

          return response.json();
        })
        .then((data) => {
          const { tasks } = camelizeKeys(data) as { tasks: Task[] };
          setGroupedTasks(
            groupTasksByLevelByTags(tasks, taskTags) as Record<string, GroupedTasksByLevel>,
          );
        })
        .catch((error) => {
          dispatch(actions.setError(error));
        });
    }, [dispatch]);

    const isTaskChosen = chosenTask.id !== null;
    const isShowAllTasks = isEmpty(chosenTags) || isEqual(chosenTags, taskTags);

    const tasksByLevel: GroupedTasksByLevel = get(groupedTasks, level, { all: [], tags: [] });
    const filteredTasks = isShowAllTasks
      ? tasksByLevel.all
      : uniqBy(
          chosenTags.flatMap((tag) => (tasksByLevel[tag] as Task[]) ?? []),
          'id',
        );
    const randomTaskName = i18n.t('random task (%{total} available)', {
      total: filteredTasks.length,
    });
    const randomTask: Task = { id: null, name: randomTaskName, origin: 'random' };
    const taskSelectValue = isTaskChosen ? chosenTask : randomTask;
    const taskOptions = [randomTask].concat(filteredTasks);
    const tagGroupValue = isTaskChosen ? (chosenTask.tags ?? []) : chosenTags;

    return (
      <>
        <div className="px-sm-3 px-md-5 mt-3">
          <TaskSelect value={taskSelectValue} onChange={setChosenTask} options={taskOptions} />
        </div>
        <h6 className="mt-3">{i18n.t('Tags')}</h6>
        <div className="px-sm-3 px-md-5 mt-3">
          <TagButtonGroup
            tags={tasksByLevel.tags}
            value={tagGroupValue}
            onChange={setChosenTags}
            disabled={isTaskChosen}
          />
        </div>
      </>
    );
  },
);

export default TaskChoice;
