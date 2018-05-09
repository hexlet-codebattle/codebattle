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
      // <div>
      //   {messages.map(({ user, message }, i) => {
      //         const key = `${user}${i}`;
      //         return (
      //           <p key={key} className="mb-1 ">
      //             <span className="font-weight-bold">{`${user}: `}</span>
      //             {message}
      //           </p>
      //         );
      //       })}
      // </div>
    <StayScrolled {...this.props}>
      {
        // messages.map((msg, i) => <Message text={`${msg.text} ${i}`} key={i} />)
        messages.map(({ user, message }, i) => <Message user={user} message={message} key={i} />)
      }
      </StayScrolled>
    );
  }
}
