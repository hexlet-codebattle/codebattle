import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import * as selectors from '../selectors';
import Messages from '../components/Messages';
import UserInfo from './UserInfo';
import ChatInput from '../components/ChatInput';
import * as chatMiddlewares from '../middlewares/Chat';
import ChatHeader from '../components/ChatHeader';

const LobbyChat = ({ connectToChat }) => {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
  const messages = useSelector(selectors.chatMessagesSelector);

  useEffect(() => {
    connectToChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="d-flex flex-wrap shadow-sm mt-2 cb-chat-container">
      <div className="col-12 col-sm-8 p-0 bg-light rounded-left h-sm-100 position-relative d-flex flex-column cb-messages-container">
        <ChatHeader />
        <Messages messages={messages} />
        <ChatInput />
      </div>
      <div className="col-12 col-sm-4 p-0 pb-3 pb-sm-5 border-left bg-light rounded-right cb-players-container">
        <div className="d-flex flex-column h-100">
          <p className="px-3 pt-3 border-top mb-3">{`Online players: ${presenceList.length}`}</p>
          <div className="d-flex flex-column align-items-start overflow-auto px-3">
            {presenceList.map(presenceUser => (
              <div key={presenceUser.id} className="mb-1">
                <UserInfo user={presenceUser.user} hideOnlineIndicator />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const mapDispatchToProps = {
  connectToChat: chatMiddlewares.connectToChat,
};

export default connect(null, mapDispatchToProps)(LobbyChat);
