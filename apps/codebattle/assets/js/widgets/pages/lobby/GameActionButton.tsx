import React from 'react';

import { ActionIcon, Button, Flex, Group, Tooltip } from '@mantine/core';
import copy from 'copy-to-clipboard';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';

import i18n from '../../../i18n';
import gameStateCodes from '../../config/gameStateCodes';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import { getSignInGithubUrl, makeGameUrl } from '../../utils/urlBuilders';

import ShowButton from './ShowButton';

export interface LobbyGamePlayer {
  id: number;
  [key: string]: unknown;
}

export interface LobbyGame {
  id: number;
  state: string;
  level: string;
  isBot?: boolean;
  visibilityType?: string;
  players: LobbyGamePlayer[];
  [key: string]: unknown;
}

const havePlayer = (userId: number | null, game: LobbyGame) =>
  !isEmpty(find(game.players, { id: userId }));

interface ContinueButtonProps {
  url: string;
  type?: string;
}

function ContinueButton({ url, type = 'table' }: ContinueButtonProps) {
  return (
    <Button
      component="a"
      href={url}
      color="cbSuccess"
      size="sm"
      radius="md"
      fullWidth={type !== 'table'}
    >
      {i18n.t('Continue')}
    </Button>
  );
}

function CopyLinkButton({ gameUrl }: { gameUrl: string }) {
  return (
    <Tooltip label={i18n.t('Copy link')} position="right">
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        onClick={() => copy(`${window.location.host}${gameUrl}`)}
        aria-label={i18n.t('Copy link')}
      >
        <i className="far fa-copy" />
      </ActionIcon>
    </Tooltip>
  );
}

function CancelGameButton({ isOnline, onCancel }: { isOnline?: boolean; onCancel: () => void }) {
  return (
    <Tooltip label={i18n.t('Cancel game')} position="right">
      <ActionIcon
        className="btn-hover"
        variant="subtle"
        color="gray"
        size="lg"
        onClick={onCancel}
        aria-label={i18n.t('Cancel game')}
        disabled={!isOnline}
      >
        <i className="fas fa-times" />
      </ActionIcon>
    </Tooltip>
  );
}

interface GameActionButtonProps {
  type?: string;
  game: LobbyGame;
  currentUserId: number | null;
  isGuest?: boolean;
  isOnline?: boolean;
}

function GameActionButton({
  type = 'table',
  game,
  currentUserId,
  isGuest,
  isOnline,
}: GameActionButtonProps) {
  const gameUrl = makeGameUrl(game.id);
  const gameUrlJoin = makeGameUrl(game.id, 'join');
  const gameState = game.state;
  const signInUrl = getSignInGithubUrl();
  const onCancel = lobbyMiddlewares.cancelGame(game.id);

  if (gameState === gameStateCodes.playing) {
    return havePlayer(currentUserId, game) ? (
      <ContinueButton url={gameUrl} type={type} />
    ) : (
      <ShowButton url={gameUrl} type={type} />
    );
  }

  if (gameState === gameStateCodes.waitingOpponent) {
    const playing = havePlayer(currentUserId, game);

    if (playing && type === 'table') {
      return (
        <Flex justify="center">
          <Group gap="xs" wrap="nowrap" ml="xl">
            <ContinueButton url={gameUrl} />
            <CopyLinkButton gameUrl={gameUrl} />
            <CancelGameButton isOnline={isOnline} onCancel={onCancel} />
          </Group>
        </Flex>
      );
    }

    if (playing) {
      return (
        <Group gap="xs" wrap="nowrap">
          <ContinueButton url={gameUrl} type={type} />
          <CopyLinkButton gameUrl={gameUrl} />
          <CancelGameButton isOnline={isOnline} onCancel={onCancel} />
        </Group>
      );
    }

    if (isGuest) {
      return (
        <Button
          variant="outline"
          color="cbSuccess"
          size="sm"
          radius="md"
          fullWidth={type === 'table'}
          data-method="get"
          data-to={signInUrl}
        >
          {i18n.t('Sign in with %{name}', { name: 'Github' })}
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        radius="md"
        px={type === 'table' ? 'lg' : undefined}
        ml={type === 'table' ? 'xs' : undefined}
        data-method="post"
        data-csrf={window.csrf_token}
        data-to={gameUrlJoin}
      >
        {i18n.t('Fight')}
      </Button>
    );
  }

  return null;
}

export default GameActionButton;
