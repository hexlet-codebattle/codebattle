import React, { useState, useEffect } from 'react';

import { faShuffle, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import cn from 'classnames';
import Gon from 'gon';
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
import { actions } from '../../slices';

const groupTasksByLevelByTags = (allTasks, taskTags) => {
  const [restTag, ...popularTags] = taskTags.slice().reverse();

  const groupTasksByTags = tasks => {
    const tasksByPopularTags = popularTags.reduce((acc, tag) => ({
      ...acc,
      [tag]: tasks.filter(({ tags }) => tags.includes(tag)),
    }), {});

    const restTasks = tasks.filter(({ tags }) => isEmpty(tags) || !isEmpty(difference(tags, popularTags)));

    const tasksByTags = omitBy({ ...tasksByPopularTags, [restTag]: restTasks }, isEmpty);

    return {
      ...tasksByTags,
      all: tasks,
      tags: Object.keys(tasksByTags),
    };
  };

  const tasksByLevel = groupBy(allTasks, 'level');

  return mapValues(tasksByLevel, groupTasksByTags);
};

function TaskSelect({ value, onChange, options }) {
  const dispatch = useDispatch();
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    axios
      .get(`/api/v1/user/${currentUserId}/stats`)
      .then(response => {
        setAvatarUrl(response.data.user.avatar_url);
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const taskOriginToIcon = {
    user: { icon: faUser },
    github: { icon: ['fab', 'github'], transform: 'down-1' },
    random: { icon: faShuffle, transform: 'down-1' },
  };

  const renderOptionLabel = task => (
    <div className="d-flex align-items-center">
      {task.creatorId === currentUserId ? (
        <img
          className="img-fluid"
          style={{ maxHeight: '24px', width: '16px' }}
          src={avatarUrl}
          alt="User avatar"
        />
      ) : (
        <FontAwesomeIcon
          icon={taskOriginToIcon[task.origin].icon}
          transform={taskOriginToIcon[task.origin].transform}
        />
      )}
      <span className="text-truncate ml-1">
        {task.name}
      </span>
    </div>
  );

  return (
    <Select
      className="w-100"
      value={value}
      onChange={onChange}
      options={options}
      getOptionLabel={task => renderOptionLabel(task)}
      getOptionValue={task => task.id}
      filterOption={createFilter({ stringify: option => option.data.name })}
    />
  );
}

export default function TaskChoice({
  chosenTask,
  setChosenTask,
  chosenTags,
  setChosenTags,
  level,
}) {
  const dispatch = useDispatch();
  const taskTags = Gon.getAsset('task_tags');

  const [groupedTasks, setGroupedTasks] = useState({});

  useEffect(() => {
    axios
      .get('/api/v1/tasks')
      .then(({ data }) => {
        const { tasks } = camelizeKeys(data);
        setGroupedTasks(groupTasksByLevelByTags(tasks, taskTags));
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskTags]);

  const toggleTagButton = tag => setChosenTags(
    prevTags => (prevTags.includes(tag)
      ? prevTags.filter(prevTag => prevTag !== tag)
      : prevTags.concat(tag)),
  );

  const randomTask = {
    id: null, name: i18n.t('random task'), origin: 'random', tags: [],
  };
  const isTaskChosen = chosenTask.id !== null;
  const tasksByLevel = get(groupedTasks, level, { all: [], tags: [] });
  const filteredTasks = isTaskChosen || isEmpty(chosenTags) || isEqual(chosenTags, taskTags)
    ? tasksByLevel.all
    : uniqBy(chosenTags.flatMap(tag => tasksByLevel[tag]), 'id');

  return (
    <>
      <h5>{i18n.t('Choose task by name or tags')}</h5>
      <div className="px-sm-3 px-md-5 mt-3 mb-2">
        <TaskSelect
          value={isTaskChosen ? chosenTask : randomTask}
          onChange={value => {
            setChosenTask(value);
            setChosenTags(value.tags);
          }}
          options={[randomTask].concat(filteredTasks)}
        />
      </div>
      <div className="px-sm-3 px-md-5 mt-3 mb-2">
        <h6>{i18n.t('Tags')}</h6>
        <div className="d-flex flex-wrap border pt-2 px-2 pb-1 pb-sm-2 rounded-lg">
          {tasksByLevel.tags.map(tag => {
            const isTagChosen = chosenTags.includes(tag);

            return (
              <button
                key={tag}
                type="button"
                className={cn('btn btn-sm mr-1 mb-1 mb-sm-0 rounded-lg text-nowrap', {
                  'bg-orange text-white': isTagChosen,
                  'tag-btn-outline-orange': !isTagChosen,
                })}
                onClick={() => toggleTagButton(tag)}
                disabled={isTaskChosen}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
