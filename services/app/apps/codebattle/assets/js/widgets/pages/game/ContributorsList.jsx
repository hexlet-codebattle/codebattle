import React, { useState, useEffect } from 'react';

import axios from 'axios';
import uniqBy from 'lodash/uniqBy';
import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import { actions } from '../../slices';

const renderContributorsList = contributors => (
  <ul className="d-flex flex-row align-items-begin list-unstyled mb-2">
    {contributors
      ? contributors.map(({ avatarLink, link }) => (
        <li key={avatarLink}>
          <a href={link}>
            <img
              className="img-fluid mr-3 cb-rounded"
              width="40"
              height="40"
              src={avatarLink}
              alt="avatar"
            />
          </a>
        </li>
        ))
      : null}
  </ul>
);

function ContributorsList({ name, tags, level }) {
  const url = `https://api.github.com/repos/hexlet-codebattle/tasks/commits?path=tasks/${level}/${tags[0]}/${name}.toml`;

  const dispatch = useDispatch();

  const [contributors, setAvatars] = useState(null);

  useEffect(() => {
    if (name === '') {
      setAvatars(null);
      return;
    }
    axios
      .get(url)
      .then(res => {
        const authors = res.data.filter(item => item.author);
        const contributorsList = authors.map(el => ({
          avatarLink: el.author.avatar_url,
          link: el.author.html_url,
        }));
        setAvatars(uniqBy(contributorsList, 'avatarLink'));
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  }, [url, name, dispatch]);

  if (!contributors || contributors.length === 0) {
    return <></>;
  }

  return (
    <div className="d-flex flex-column mb-1 align-self-end">
      <h6 className="card-text">
        {i18n.t('This users have contributed to this task:')}
      </h6>
      {renderContributorsList(contributors)}
    </div>
  );
}

export default ContributorsList;
