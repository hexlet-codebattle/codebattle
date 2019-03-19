import React, { Component } from 'react';
import StayScrolled from 'react-stay-scrolled';
import Message from './Message.jsx';

export default class Messages extends Component {
  static defaultProps = {
    messages: [],
  }

  render() {
    const { messages } = this.props;

    return (
      <StayScrolled {...this.props}>
        {messages.map(({ user, message }, i) => <Message user={user} message={message} key={i} />)}
      </StayScrolled>
    );
  }
}
