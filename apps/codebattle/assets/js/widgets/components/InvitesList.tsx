import React from 'react';

import { Box, Button, Flex, Text } from '@mantine/core';
import { useDispatch } from 'react-redux';

import { type AppDispatch } from '@/slices';

import i18n from '../../i18n';
import { acceptInvite, declineInvite, cancelInvite } from '../middlewares/Invite';

import GameLevelBadge from './GameLevelBadge';

interface InviteUser {
  name: string;
}

interface InviteItem {
  id: number;
  creatorId: number;
  recipientId: number;
  creator: InviteUser;
  recipient: InviteUser;
  gameParams: { level: string };
}

interface InvitesListProps {
  list: InviteItem[];
  followId?: number | null;
  currentUserId: number;
}

function NoInvites() {
  return (
    <Text p="sm" ta="center">
      {i18n.t('No Invites')}
    </Text>
  );
}

function InvitesList({ list, followId, currentUserId }: InvitesListProps) {
  const dispatch = useDispatch<AppDispatch>();

  if (followId && list.length === 0) {
    return <></>;
  }

  if (list.length === 0) {
    return <NoInvites />;
  }

  return list
    .sort(
      (({ creatorId }: InviteItem) => creatorId === currentUserId) as unknown as (
        a: InviteItem,
        b: InviteItem,
      ) => number,
    )
    .map(({ id, creatorId, recipientId, creator, recipient, gameParams }) => (
      <Flex key={id} align="center" p="sm">
        <Box mx="xs">
          <GameLevelBadge level={gameParams.level} />
        </Box>
        {currentUserId === recipientId && (
          <>
            <Text truncate size="sm" mx="sm" mr="auto">
              <Text span fw={700}>
                {creator.name}
              </Text>
              <Text span mr="sm">
                {' '}
                {i18n.t('invited you')}
              </Text>
            </Text>
            <Button
              variant="outline"
              color="red"
              radius="md"
              size="compact-sm"
              px="xs"
              mx="xs"
              onClick={() => dispatch(acceptInvite(id))}
            >
              {i18n.t('Accept')}
            </Button>
            <Button
              variant="outline"
              color="cbSecondary"
              className="cb-btn-outline-secondary"
              radius="md"
              size="compact-sm"
              px="xs"
              mx="xs"
              onClick={() => dispatch(declineInvite(id, creator.name))}
            >
              {i18n.t('Decline')}
            </Button>
          </>
        )}
        {currentUserId === creatorId && (
          <>
            <Text truncate size="sm" ml="sm" mr="auto">
              {i18n.t('You invited ')}
              <Text span fw={700} mr="sm">
                {recipient.name}
              </Text>
            </Text>
            <Button
              variant="outline"
              color="cbSecondary"
              className="cb-btn-outline-secondary"
              radius="md"
              size="compact-sm"
              px="xs"
              mx="xs"
              onClick={() => dispatch(cancelInvite(id, recipient.name))}
            >
              {i18n.t('Cancel')}
            </Button>
          </>
        )}
      </Flex>
    ));
}

export default InvitesList;
