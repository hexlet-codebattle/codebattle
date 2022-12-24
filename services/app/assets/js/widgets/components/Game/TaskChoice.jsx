import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';
// import Gon from 'gon';
import cn from 'classnames';
import { camelizeKeys } from 'humps';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShuffle, faUser } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';

import * as selectors from '../../selectors';
import { actions } from '../../slices';
import i18n from '../../../i18n';

const isRandomTask = task => !_.has(task, 'id');

const mapTagsToTaskIds = (tasks, tags) => {
  const otherTag = tags.at(-1);
  const popularTags = tags.slice(0, -1);

  const initAcc = tags.reduce((acc, tag) => (
    { ...acc, [tag]: [] }
  ), {});

  return tasks.reduce((acc, task) => {
    const newAcc = task.tags.reduce((currentAcc, tag) => {
      if (tag === '') {
        const withoutTagsTaskIds = _.get(acc, 'withoutTags', []);
        return { ...currentAcc, withoutTags: [...withoutTagsTaskIds, task.id] };
      }

      if (!popularTags.includes(tag)) {
        const withUnpopularTagsTasksIds = _.get(acc, otherTag, []);
        return {
          ...currentAcc,
          [otherTag]: [...withUnpopularTagsTasksIds, task.id],
        };
      }

      const taskIds = _.get(acc, tag, []);
      return { ...currentAcc, [tag]: [...taskIds, task.id] };
    }, {});

    return {
      ...acc,
      ...newAcc,
    };
  }, initAcc);
};

const getTaskIdsByTags = (dictionary, tags) => {
  const taskIds = tags.map(tag => dictionary[tag]);
  return _.intersection(...taskIds);
};

const filterTasksByTagsAndLevel = (tasks, tags, dictionary) => {
  if (tags.length === 0) {
    return tasks;
  }

  const availableTaskIds = getTaskIdsByTags(dictionary, tags);
  return tasks.filter(task => availableTaskIds.includes(task.id));
};

const CurrentUserTaskLabel = ({ task, userStats = { user: { avatarUrl: '' } } }) => {
  const { user: { avatarUrl } } = userStats;

  return (
    <div className="d-flex align-items-center">
      <div className="mr-1">
        <img
          className="img-fluid"
          style={{ maxHeight: '16px', width: '16px' }}
          src={avatarUrl}
          alt="User avatar"
        />
      </div>
      <div>
        <span className="text-truncate">
          {task.name}
        </span>
      </div>
    </div>
  );
};

const renderIcon = type => {
  switch (type) {
    case 'user':
      return (
        <FontAwesomeIcon
          icon={faUser}
          className="mr-1"
        />
      );
    case 'github':
      return (
        <FontAwesomeIcon
          icon={['fab', 'github']}
          className="mr-1"
        />
      );
    default:
      return (
        <FontAwesomeIcon
          icon={faShuffle}
          className="mr-1"
        />
      );
  }
};

const isCreatedByCurrentUser = (taskCreatorId, userId) => taskCreatorId && taskCreatorId === userId;

const TaskLabel = ({ task, userStats, currentUserId }) => {
  if (isCreatedByCurrentUser(task.creatorId, currentUserId)) {
    return <CurrentUserTaskLabel task={task} userStats={userStats} />;
  }

  return (
    <span className="text-truncate">
      {renderIcon(task.origin)}
      <span>{task.name}</span>
    </span>
  );
};

const TaskSelect = ({
  setChosenTask,
  randomTask,
  tasks,
  level,
}) => {
  const dispatch = useDispatch();
  const defaultOption = { label: <TaskLabel task={randomTask} />, value: randomTask.name };
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const [userStats, setUserStats] = useState({});
  const allTasks = [randomTask, ...tasks];

  useEffect(() => {
    axios
      .get(`/api/v1/user/${currentUserId}/stats`)
      .then(response => {
        setUserStats(camelizeKeys(response.data));
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  }, [currentUserId]);

  useEffect(() => {
    setChosenTask(defaultOption.value);
  }, [level]);

  const onChange = ({ value }) => setChosenTask(value);

  return (
    <Select
      key={`task-choise-${level}`}
      className="w-100"
      defaultValue={defaultOption}
      onChange={onChange}
      filterOption={({ value: { name } }, inputValue) => (
        name.toLowerCase().includes(inputValue.toLowerCase())
      )}
      options={
        allTasks.map(task => (
          {
            label: <TaskLabel
              task={task}
              userStats={userStats}
              currentUserId={currentUserId}
            />,
            value: task,
          }))
        }
    />
  );
};

export default ({
  chosenTask,
  setChosenTask,
  chosenTags,
  setChosenTags,
  level,
  randomTask,
}) => {
  const dispatch = useDispatch();
  const taskTags = window.Gon.getAsset('task_tags');

  const [allTasks, setAllTasks] = useState([]);

  useEffect(() => {
    axios
      .get('/api/v1/tasks')
      .then(({ data }) => {
        const { tasks } = camelizeKeys(data);
        setAllTasks(tasks);
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  }, []);

  const tagsToTaskIdsDictionary = mapTagsToTaskIds(allTasks, taskTags);

  const tasksFilteredByLevel = allTasks.filter(task => task.level === level);

  const filteredTasks = filterTasksByTagsAndLevel(tasksFilteredByLevel, chosenTags, tagsToTaskIdsDictionary, level);

  const isTagButtonDisabled = tag => {
    if (!isRandomTask(chosenTask)) {
      return true;
    }
    const availableTaskIds = getTaskIdsByTags(tagsToTaskIdsDictionary, [...chosenTags, tag]);
    return availableTaskIds.length === 0;
  };

  const isTagChosen = tag => (
    isRandomTask(chosenTask)
      ? chosenTags.includes(tag)
      : tagsToTaskIdsDictionary[tag].includes(chosenTask.id)
  );

  const toggleTagButton = tag => {
    if (chosenTags.includes(tag)) {
      const tagsWithoutChosen = chosenTags.filter(chosenTag => chosenTag !== tag);
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
          setChosenTask={setChosenTask}
          randomTask={randomTask}
          tasks={filteredTasks}
          level={level}
        />
      </div>
      <div className="d-flex flex-column justify-content-around px-5 mt-3 mb-2">
        <h6>{i18n.t('Tags')}</h6>
        <div className="border p-2">
          {taskTags.map(tag => (
            <button
              key={tag}
              type="button"
              className={cn('btn btn-sm mr-1 tag', {
                'bg-orange text-white': isTagChosen(tag),
                'tag-btn-outline-orange': !isTagChosen(tag),
              })}
              onClick={() => toggleTagButton(tag)}
              disabled={isTagButtonDisabled(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
