import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import * as selectors from '../selectors';
import Messages from '../components/Messages';
import UserInfo from './UserInfo';
import ChatInput from '../components/ChatInput';
import 'emoji-mart/css/emoji-mart.css';
import * as chatMiddlewares from '../middlewares/Chat';

const LobbyChat = ({ connectToChat }) => {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
  const messages = useSelector(state => selectors.chatMessagesSelector(state));

  useEffect(() => {
    connectToChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="d-flex shadow-sm mt-2" style={{ height: '500px' }}>
      <div className="col-12 col-sm-8 p-0 bg-light rounded-left h-100 position-relative">
        <Messages messages={messages} />
        <ChatInput />
      </div>
      <div className="col-4 d-none d-sm-block p-0 border-left bg-light rounded-right">
        <div className="d-flex flex-column justify-content-start overflow-auto h-100">
          <div className="px-3 py-3 w-100 border-top">
            <p className="mb-1">{`Online players: ${presenceList.length}`}</p>
            {presenceList.map(presenceUser => (
              <div key={presenceUser.id} className="my-1">
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
