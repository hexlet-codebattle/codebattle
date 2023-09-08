import React, { useState, useEffect } from 'react';

import { faShuffle, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import cn from 'classnames';
import Gon from 'gon';
import { camelizeKeys } from 'humps';
import get from 'lodash/get';
import has from 'lodash/has';
import intersection from 'lodash/intersection';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';

import i18n from '../../../i18n';
import * as selectors from '../../selectors';
import { actions } from '../../slices';

const isRandomTask = (task) => !has(task, 'id');

const mapTagsToTaskIds = (tasks, tags) => {
  const otherTag = tags.at(-1);
  const popularTags = tags.slice(0, -1);

  const initAcc = tags.reduce((acc, tag) => ({ ...acc, [tag]: [] }), {});

  return tasks.reduce((acc, task) => {
    const newAcc = task.tags.reduce((currentAcc, tag) => {
      if (tag === '') {
        const withoutTagsTaskIds = get(acc, 'withoutTags', []);
        return { ...currentAcc, withoutTags: [...withoutTagsTaskIds, task.id] };
      }

      if (!popularTags.includes(tag)) {
        const withUnpopularTagsTasksIds = get(acc, otherTag, []);
        return {
          ...currentAcc,
          [otherTag]: [...withUnpopularTagsTasksIds, task.id],
        };
      }

      const taskIds = get(acc, tag, []);
      return { ...currentAcc, [tag]: [...taskIds, task.id] };
    }, {});

    return {
      ...acc,
      ...newAcc,
    };
  }, initAcc);
};

const getTaskIdsByTags = (dictionary, tags) => {
  const taskIds = tags.map((tag) => dictionary[tag]);
  return intersection(...taskIds);
};

const filterTasksByTagsAndLevel = (tasks, tags, dictionary) => {
  if (tags.length === 0) {
    return tasks;
  }

  const availableTaskIds = getTaskIdsByTags(dictionary, tags);
  return tasks.filter((task) => availableTaskIds.includes(task.id));
};

function CurrentUserTaskLabel({ task, userStats = { user: { avatarUrl: '' } } }) {
  const {
    user: { avatarUrl },
  } = userStats;

  return (
    <div className="d-flex align-items-center">
      <div className="mr-1">
        <img
          alt="User avatar"
          className="img-fluid"
          src={avatarUrl}
          style={{ maxHeight: '16px', width: '16px' }}
        />
      </div>
      <div>
        <span className="text-truncate">{task.name}</span>
      </div>
    </div>
  );
}

const renderIcon = (type) => {
  switch (type) {
    case 'user':
      return <FontAwesomeIcon className="mr-1" icon={faUser} />;
    case 'github':
      return <FontAwesomeIcon className="mr-1" icon={['fab', 'github']} />;
    default:
      return <FontAwesomeIcon className="mr-1" icon={faShuffle} />;
  }
};

const isCreatedByCurrentUser = (taskCreatorId, userId) => taskCreatorId && taskCreatorId === userId;

function TaskLabel({ currentUserId, task, userStats }) {
  if (isCreatedByCurrentUser(task.creatorId, currentUserId)) {
    return <CurrentUserTaskLabel task={task} userStats={userStats} />;
  }

  return (
    <span className="text-truncate">
      {renderIcon(task.origin)}
      <span>{task.name}</span>
    </span>
  );
}

function TaskSelect({ level, randomTask, setChosenTask, tasks }) {
  const dispatch = useDispatch();
  const defaultOption = { label: <TaskLabel task={randomTask} />, value: randomTask.name };
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const [userStats, setUserStats] = useState({});
  const allTasks = [randomTask, ...tasks];

  useEffect(() => {
    axios
      .get(`/api/v1/user/${currentUserId}/stats`)
      .then((response) => {
        setUserStats(camelizeKeys(response.data));
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    setChosenTask(defaultOption.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const onChange = ({ value }) => setChosenTask(value);

  return (
    <Select
      key={`task-choise-${level}`}
      className="w-100"
      defaultValue={defaultOption}
      filterOption={({ value: { name } }, inputValue) =>
        name.toLowerCase().includes(inputValue.toLowerCase())
      }
      options={allTasks.map((task) => ({
        label: <TaskLabel currentUserId={currentUserId} task={task} userStats={userStats} />,
        value: task,
      }))}
      onChange={onChange}
    />
  );
}

export default function TaskChoice({
  chosenTags,
  chosenTask,
  level,
  randomTask,
  setChosenTags,
  setChosenTask,
}) {
  const dispatch = useDispatch();
  const taskTags = Gon.getAsset('task_tags');

  const [allTasks, setAllTasks] = useState([]);

  useEffect(() => {
    axios
      .get('/api/v1/tasks')
      .then(({ data }) => {
        const { tasks } = camelizeKeys(data);
        setAllTasks(tasks);
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tagsToTaskIdsDictionary = mapTagsToTaskIds(allTasks, taskTags);

  const tasksFilteredByLevel = allTasks.filter((task) => task.level === level);

  const filteredTasks = filterTasksByTagsAndLevel(
    tasksFilteredByLevel,
    chosenTags,
    tagsToTaskIdsDictionary,
    level,
  );

  const isTagButtonDisabled = (tag) => {
    if (!isRandomTask(chosenTask)) {
      return true;
    }
    const availableTaskIds = getTaskIdsByTags(tagsToTaskIdsDictionary, [...chosenTags, tag]);
    return availableTaskIds.length === 0;
  };

  const isTagChosen = (tag) =>
    isRandomTask(chosenTask)
      ? chosenTags.includes(tag)
      : tagsToTaskIdsDictionary[tag].includes(chosenTask.id);

  const toggleTagButton = (tag) => {
    if (chosenTags.includes(tag)) {
      const tagsWithoutChosen = chosenTags.filter((chosenTag) => chosenTag !== tag);
      setChosenTags(tagsWithoutChosen);
      return;
    }
    setChosenTags([...chosenTags, tag]);
  };

  return (
    <>
      <h5>{i18n.t('Choose task by name or tags')}</h5>
      <div className="d-flex justify-content-around px-5 mt-3 mb-2">
        <TaskSelect
          level={level}
          randomTask={randomTask}
          setChosenTask={setChosenTask}
          tasks={filteredTasks}
        />
      </div>
      <div className="d-flex flex-column justify-content-around px-5 mt-3 mb-2">
        <h6>{i18n.t('Tags')}</h6>
        <div className="border p-2 rounded-lg">
          {taskTags.map((tag) => (
            <button
              key={tag}
              disabled={isTagButtonDisabled(tag)}
              type="button"
              className={cn('btn btn-sm mr-1 tag rounded-lg', {
                'bg-orange text-white': isTagChosen(tag),
                'tag-btn-outline-orange': !isTagChosen(tag),
              })}
              onClick={() => toggleTagButton(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
