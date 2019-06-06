import React, { Component } from 'react';

class Message extends Component {
  static defaultProps = {
    message: '',
    user: '',
  }

  render() {
    const { message, user } = this.props;

    return (
      <div>
        <span className="font-weight-bold">{`${user}: `}</span>
        <span>{message}</span>
      </div>
    );
  }
}

export default (Message);
