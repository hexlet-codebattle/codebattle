import React from 'react';
// import _ from 'lodash';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchState, addMessage } from '../middlewares/Chat';
import { currentUserSelector } from '../selectors';
import Messages from '../components/Messages';
import UserName from '../components/UserName';

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

  state = { message: '' }

  messagesEnd = null

  componentDidMount() {
    const { dispatch } = this.props;

    dispatch(fetchState());
  }

  handleChange = (e) => {
    this.setState({ message: e.target.value });
  }

  sendMessage = () => {
    const { message } = this.state;
    const { currentUser: { name } } = this.props;

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
    const { message } = this.state;
    const { messages, users } = this.props;

    return (
      <div
        className="card-group"
        style={{ height: '100%' }}
      >
        <div className="card col-8 p-0">
          <div className="card-body pb-0">
            <h6 className="card-title">Chat</h6>
            <p className="card-text">
              <Messages
                messages={messages}
                style={{
                  display: 'inline-block',
                  flexGrow: '1',
                  width: '100%',
                  maxHeight: '130px',
                  overflowY: 'scroll',
                }}
              />
            </p>
          </div>
          <div className="card-footer p-0">
            <div className="input-group input-group-sm">
              <input
                className="form-control"
                type="text"
                placeholder="Type message here..."
                value={message}
                onChange={this.handleChange}
                onKeyPress={this.handleKeyPress}
              />
              <div className="input-group-append">
                <button
                  className="btn btn-light border"
                  type="button"
                  onClick={this.sendMessage}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="card col-4 p-0">
          <div className="card-body pb-0">
            <h6 className="card-title">Online users</h6>
            <p
              style={{
                display: 'inline-block',
                flexGrow: '1',
                width: '100%',
                maxHeight: '150px',
                overflowY: 'scroll',
              }}
            >
              {users.map(user => (
                <div key={user.id} className="my-2">
                  {' '}
                  <UserName user={user} />
                  {' '}
                </div>
              ))}
            </p>
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
