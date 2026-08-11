import React, { memo, useCallback, useRef, useEffect } from 'react';

import { Box, Button, Flex, Text, Stack } from '@mantine/core';
import { useSelector } from 'react-redux';

import i18next from '../../../i18n';
import Messages from '../../components/Messages';
import { pushCommand, pushCommandTypes, deleteMessage } from '../../middlewares/Chat';
import * as selectors from '../../selectors';

import TournamentChatInput from './TournamentChatInput';

function TournamentChat() {
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const currentUserCanModerate = useSelector(selectors.currentUserCanModerateTournament);
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const messages = useSelector(selectors.chatMessagesSelector);
  const isOnline = useSelector(selectors.chatChannelStateSelector);

  const handleCleanBanned = useCallback(() => {
    pushCommand({ type: pushCommandTypes.cleanBanned });
  }, []);

  const handleBanUser = useCallback(({ userId, name }: { userId: number; name: string }) => {
    pushCommand({ type: 'ban', name, user_id: userId });
  }, []);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [messages]);

  return (
    <Box
      className="cb-tournament-chat cb-bg-panel cb-rounded pos-relative"
      style={{
        display: 'flex',
        flexDirection: 'column',
        margin: '0.5rem 0',
        boxShadow: 'var(--mantine-shadow-sm)',
      }}
    >
      <div className="cb-tournament-chat-header">
        <Flex direction="column" style={{ minWidth: 0 }}>
          <span className="cb-tournament-chat-title">{i18next.t('Tournament chat')}</span>
          <Text size="xs" className="cb-tournament-chat-subtitle">
            {i18next.t('Please, be nice in chat')}
          </Text>
        </Flex>
        {currentUserIsAdmin && (
          <Button
            size="xs"
            variant="default"
            className="cb-tournament-chat-clean"
            onClick={handleCleanBanned}
            disabled={!isOnline}
          >
            {i18next.t('Clean banned')}
          </Button>
        )}
      </div>
      <Flex direction="column" flex={1} style={{ overflow: 'hidden' }}>
        <div
          ref={messagesContainerRef}
          className="cb-tournament-chat-messages"
          id="new-chat-message"
          style={{ scrollBehavior: 'smooth', overflow: 'auto', height: '100%' }}
        >
          <Messages
            messages={messages as unknown as React.ComponentProps<typeof Messages>['messages']}
            onBanUser={currentUserIsAdmin ? handleBanUser : undefined}
            currentUserId={currentUserId}
            onDeleteMessage={deleteMessage}
            canDeleteAny={currentUserCanModerate}
          />
        </div>
      </Flex>
      <div className="cb-tournament-chat-composer">
        <TournamentChatInput disabled={!isOnline} />
      </div>
    </Box>
  );
}

export default memo(TournamentChat);
