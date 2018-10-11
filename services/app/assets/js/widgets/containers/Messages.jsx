import React, { Component } from 'react';
import StayScrolled from 'react-stay-scrolled';
import Message from './Message.jsx';

const initialState = {
  messages: [],
};

export default class Messages extends Component {
  constructor(props) {
    super(props);
  }

  static defaultProps = {
    messages: [],
  }

  render() {
    const { messages } = this.props;

    return (
      <StayScrolled {...this.props}>
        {
        messages.map(({ user, message }, i) => <Message user={user} message={message} key={i} />)
      }
      </StayScrolled>
    );
  }
}
