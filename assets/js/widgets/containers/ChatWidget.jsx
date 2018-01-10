import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchState, addMessage } from '../middlewares/Chat';
import { currentUserSelector } from '../selectors/user';

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

  state = { message: '' };

  componentDidMount() {
    const { dispatch } = this.props;

    dispatch(fetchState());
  }

  handleChange = (e) => {
    this.setState({ message: e.target.value });
  }

  sendMessage = () => {
    const { message } = this.state;
    const { name } = this.props.currentUser;

    if (message) {
      addMessage(name, message);
      this.setState({ message: '' });
    }
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.sendMessage();
    }
  }

  render() {
    return (
      <div className="row p-3">
        <div className="col-9 p-1 border">
          <p className="m-1"><b>Chat</b></p>
          <div className="chat-box p-2">
            {this.props.messages.map(({ user, message }, i) => <p key={i} className="mb-1"><b>{user}:</b> {message}</p>)}
          </div>
          <div className="input-group input-group-sm mt-3">
            <input
              className="form-control"
              type="text"
              placeholder="Type message here..."
              value={this.state.message}
              onChange={this.handleChange}
              onKeyPress={this.handleKeyPress}
            />
            <div className="input-group-btn">
              <button
                className="btn btn-outline-success"
                type="button"
                onClick={this.sendMessage}
              >
                Send
              </button>
            </div>
          </div>
        </div>
        <div className="col-3 p-1 border">
          <p className="m-1"><b>Online users</b></p>
          <div className="online-users">
            {this.props.users.map(user => <p className="m-1" key={user.id}>{user.name}</p>)}
          </div>
        </div>
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
