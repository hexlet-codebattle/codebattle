import React, { memo, useCallback, useRef, useEffect } from 'react';

import i18next from 'i18next';
import { useSelector } from 'react-redux';

import Messages from '../../components/Messages';
import { pushCommand, pushCommandTypes } from '../../middlewares/Chat';
import * as selectors from '../../selectors';

import TournamentChatInput from './TournamentChatInput';

function TournamentChat() {
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);
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
    <div className="cb-tournament-chat my-2 mt-lg-0 sticky-top cb-bg-panel cb-rounded position-relative d-flex flex-column shadow-sm">
      <div className="cb-tournament-chat-header">
        <div className="d-flex flex-column min-w-0">
          <span className="cb-tournament-chat-title">{i18next.t('Tournament chat')}</span>
          <small className="cb-tournament-chat-subtitle">
            {i18next.t('Please, be nice in chat')}
          </small>
        </div>
        {currentUserIsAdmin && (
          <button
            type="button"
            className="btn btn-sm cb-tournament-chat-clean"
            onClick={handleCleanBanned}
            disabled={!isOnline}
          >
            {i18next.t('Clean banned')}
          </button>
        )}
      </div>
      <div className="flex-grow-1 overflow-hidden d-flex flex-column">
        <div
          ref={messagesContainerRef}
          className="cb-tournament-chat-messages overflow-auto h-100"
          id="new-chat-message"
          style={{ scrollBehavior: 'smooth' }}
        >
          <Messages
            messages={messages as unknown as React.ComponentProps<typeof Messages>['messages']}
            onBanUser={currentUserIsAdmin ? handleBanUser : undefined}
          />
        </div>
      </div>
      <div className="cb-tournament-chat-composer">
        <TournamentChatInput disabled={!isOnline} />
      </div>
    </div>
  );
}

export default memo(TournamentChat);
