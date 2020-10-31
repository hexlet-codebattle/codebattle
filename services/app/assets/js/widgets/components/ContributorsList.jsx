import { useDispatch } from 'react-redux';
import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import axios from 'axios';

import { actions } from '../slices';

const renderContributorsList = contributors => (
  <ul className="d-flex flex-row align-items-begin list-unstyled mb-2">
    {contributors
      ? contributors.map(({ avatarLink, link }) => (
        <li key={avatarLink}>
          <a href={link}>
            <img
              className="img-fluid mr-3"
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

const ContributorsList = ({ name }) => {
  const url = `https://api.github.com/repos/hexlet-codebattle/battle_asserts/commits?path=src/battle_asserts/issues/${name}.clj`;

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
        setAvatars(_.uniqBy(contributorsList, 'avatarLink'));
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  }, [url, name, dispatch]);

  return (
    <div className="d-flex flex-column mb-1 align-self-end">
      <h6 className="card-text">This users have contributed to this task:</h6>
      {renderContributorsList(contributors)}
    </div>
  );
};

export default ContributorsList;
