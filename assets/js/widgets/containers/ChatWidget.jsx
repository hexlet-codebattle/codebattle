import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchState } from '../middlewares/Chat';

class ChatWidget extends React.Component {
  static propTypes = {
    users: PropTypes.array,
    messages: PropTypes.array,
    dispatch: PropTypes.func.isRequired,
  };

  componentDidMount() {
    const { dispatch } = this.props;

    dispatch(fetchState());
  }

  render() {
    return (
      <div>
        <h1>Chat Widget</h1>
        <h2>Users</h2>
        <ul>
          {this.props.users.map(user => <li key={user}>{user}</li>)}
        </ul>
        <h2>Messages</h2>
        <ul>
          {this.props.messages.map(user => <li>{user}</li>)}
        </ul>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  const { users, messages } = state.chat;
  return {
    users,
    messages,
  };
};

export default connect(mapStateToProps, null)(ChatWidget);
// export default ChatWidget;
