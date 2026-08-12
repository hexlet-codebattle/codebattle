import React, { useState, useEffect } from 'react';

import { Flex, Group, Stack, Text } from '@mantine/core';
import uniqBy from 'lodash/uniqBy';
import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import { actions, type AppDispatch } from '../../slices';

interface Contributor {
  avatarLink: string;
  link: string;
}

interface GithubCommit {
  author?: {
    avatar_url: string;
    html_url: string;
  };
}

const renderContributorsList = (contributors: Contributor[] | null) => (
  <Group
    gap="sm"
    align="flex-start"
    wrap="nowrap"
    mb="sm"
    style={{ listStyle: 'none', padding: 0, margin: 0 }}
    component="ul"
  >
    {contributors
      ? contributors.map(({ avatarLink, link }) => (
          <li key={avatarLink}>
            <a href={link}>
              <img
                style={{ borderRadius: 'var(--mantine-radius-md)' }}
                width="40"
                height="40"
                src={avatarLink}
                alt={i18n.t('avatar')}
              />
            </a>
          </li>
        ))
      : null}
  </Group>
);

interface ContributorsListProps {
  task: {
    name: string;
    tags?: string[];
    level: string;
  };
}

function ContributorsList({ task: { name, tags, level } }: ContributorsListProps) {
  const url = `https://api.github.com/repos/hexlet-codebattle/tasks/commits?path=tasks/${level}/${tags && tags[0]}/${name}.toml`;

  const dispatch = useDispatch<AppDispatch>();

  const [contributors, setAvatars] = useState<Contributor[] | null>(null);

  useEffect(() => {
    if (name === '') {
      setAvatars(null);
      return;
    }
    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        return response.json();
      })
      .then((data: GithubCommit[]) => {
        const authors = data.filter((item) => item.author);
        const contributorsList = authors.map((el) => ({
          avatarLink: el.author!.avatar_url,
          link: el.author!.html_url,
        }));
        setAvatars(uniqBy(contributorsList, 'avatarLink'));
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
  }, [url, name, dispatch]);

  if (!contributors || contributors.length === 0) {
    return <></>;
  }

  return (
    <Stack mb="xs" align="flex-end" gap={0}>
      <Text size="sm">{i18n.t('This users have contributed to this task:')}</Text>
      {renderContributorsList(contributors)}
    </Stack>
  );
}

export default ContributorsList;
