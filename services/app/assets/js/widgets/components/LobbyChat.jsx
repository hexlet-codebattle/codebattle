import React from 'react';
import ReactLoading from 'react-loading';
import UserInfo from '../containers/UserInfo';

const LobbyChat = ({ users }) => (
  <div className="d-flex my-0 py-1 justify-content-center">
    <h3>Chat</h3>

    <div className="px-3 py-3 w-100 border-top">
      <p className="mb-1">{`Online users: ${users.length}`}</p>
      {users.map(user => (
        <div key={user.id} className="my-1">
          <UserInfo user={user} />
        </div>
        ))}
    </div>
    <ReactLoading type="spin" color="#6c757d" height={50} width={50} />
  </div>
  );

export default LobbyChat;
