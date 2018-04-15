import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchState, addMessage } from '../middlewares/Chat';
import { currentUserSelector } from '../selectors';

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

  componentDidMount() {
    const { dispatch } = this.props;

    dispatch(fetchState());
    _.defer(this.scrollBottom);
  }

  messagesEnd = null

  handleChange = (e) => {
    this.setState({ message: e.target.value });
  }

  scrollBottom = () => {
    if (this.messagesEnd) {
      (this.messagesEnd).scrollIntoView({ behavior: 'smooth' });
    }
  }

  sendMessage = () => {
    const { message } = this.state;
    const { name } = this.props.currentUser;

    if (message) {
      addMessage(name, message);
      this.setState({ message: '' });
    }
    this.scrollBottom();
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.sendMessage();
    }
  }

  render() {
    return (
      <div
        className="card-group"
        style={{
          height: '100%',
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: '15px',
          left: '15px',
        }}
      >
        <div className="card col-8 p-0">
          <div className="card-header font-weight-bold">Chat</div>
          <div className="card-body" style={{ overflow: 'scroll' }}>
            {this.props.messages.map(({ user, message }, i) => {
              const key = `${user}${i}`;
              return (
                <p key={key} className="mb-1 ">
                  <span className="font-weight-bold">{`${user}: `}</span>
                  {message}
                </p>
              );
            })}
            <div ref={(el) => { this.messagesEnd = el; }} />
          </div>
          <div className="card-footer">
            <div className="input-group input-group-sm">
              <input
                className="form-control"
                type="text"
                placeholder="Type message here..."
                value={this.state.message}
                onChange={this.handleChange}
                onKeyPress={this.handleKeyPress}
              />
              <div className="input-group-append">
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
        </div>
        <div className="card col-4 p-0">
          <span
            className="card-header font-weight-bold text-truncate"
            title="Online users"
          >
            Online users
          </span>
          <div className="card-body">
            {this.props.users.map(user => (
              <p
                className="m-1 text-truncate"
                key={user.id}
                title={user.name}
              >
                {user.name}
              </p>
            ))}
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
