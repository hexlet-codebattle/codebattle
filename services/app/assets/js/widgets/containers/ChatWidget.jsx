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

  state = { message: '' };

  messagesEnd = null;

  componentDidMount() {
    const { dispatch } = this.props;

    dispatch(fetchState());
  }

  handleChange = (e) => {
    this.setState({ message: e.target.value });
  };

  sendMessage = () => {
    const { message } = this.state;
    const {
      currentUser: { name },
    } = this.props;

    if (message) {
      addMessage(name, message);
      this.setState({ message: '' });
    }
  };

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.sendMessage();
    }
  };

  render() {
    const { message } = this.state;
    const { messages, users } = this.props;

    return (
      <div className="d-flex">
        <div className="card col-8 p-0 border-0 shadow-sm">
          <div
            className="card-body p-0"
          >
            <div className="card-text">
              <Messages
                messages={messages}
                className="overflow-auto px-3 py-2"
                style={{ height: '180px' }}
              />
            </div>
          </div>
          <div className="card-footer p-0 border-0">
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
                <button className="btn btn-light border" type="button" onClick={this.sendMessage}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="card col-4 p-0 border-0 shadow-sm">
          <div className="card-body p-0">
            <p className="pl-3 pr-1 pt-2 mb-0">{`Online users: ${users.length}`}</p>
            <div
              className="pl-3 pr-3 overflow-auto"
              style={{ height: '165px' }}
            >
              {users.map(user => (
                <div key={user.id} className="my-2">
                  <UserName user={user} />
                </div>
              ))}
            </div>
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

export default connect(
  mapStateToProps,
  null,
)(ChatWidget);
