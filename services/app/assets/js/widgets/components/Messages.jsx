import React from 'react';
import StayScrolled from 'react-stay-scrolled';
import Message from './Message';

export default (props) => {
  const { messages = [] } = props;

  return (
    <StayScrolled {...props}>
      {/* eslint-disable-next-line react/no-array-index-key */}
      {messages.map(({ user, message }, i) => <Message user={user} message={message} key={i} />)}
    </StayScrolled>
  );
};
