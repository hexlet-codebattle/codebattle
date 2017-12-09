import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchState, addMessage } from '../middlewares/Chat';
import { currentUserSelector } from '../redux/UserRedux';

class ChatWidget extends React.Component {
  static propTypes = {
    currentUser: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
    }).isRequired,
    users: PropTypes.array.isRequired,
    messages: PropTypes.array.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  componentDidMount() {
    const { dispatch } = this.props;

    dispatch(fetchState());
  }

  handleKeyPress = (event) => {
    const message = event.target.value;
    const { name } = this.props.currentUser;

    if (event.key === 'Enter') {
      addMessage(name, message);
    }
  }

  render() {
    return (
      <div>
        <h1>Chat Widget</h1>
        <h2>Users</h2>
        <ul>
          {this.props.users.map(user => <li key={user.id}>{user.name}</li>)}
        </ul>
        <h2>Messages</h2>
        <ul>
          {this.props.messages.map(({ user, message }) => <li><b>{user}:</b> {message}</li>)}
        </ul>
        <input type="text" id="one" onKeyPress={this.handleKeyPress} />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  const { users, messages } = state.chat;
  return {
    users,
    messages,
    currentUser: currentUserSelector(state),
  };
};

export default connect(mapStateToProps, null)(ChatWidget);
// export default ChatWidget;
