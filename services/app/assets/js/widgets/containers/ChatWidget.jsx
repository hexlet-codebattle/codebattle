import React from 'react';
import { connect } from 'react-redux';
import { fetchState, addMessage } from '../middlewares/Chat';
import { chatUsersSelector, chatMessagesSelector, currentChatUserSelector } from '../selectors';
import Messages from '../components/Messages';
import UserName from '../components/UserName';

class ChatWidget extends React.Component {
  state = { message: '' };

  messagesEnd = null;

  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(fetchState());
  }

  handleChange = (e) => {
    this.setState({ message: e.target.value });
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const { message } = this.state;
    const {
      currentUser: { name },
    } = this.props;

    if (message) {
      addMessage(name, message);
      this.setState({ message: '' });
    }
  };

  render() {
    const { message } = this.state;
    const { messages, users } = this.props;
    return (
      <div className="d-flex shadow-sm">
        <div className="col-12 col-sm-8 p-0 bg-white rounded-left">
          <Messages
            messages={messages}
            className="overflow-auto px-3 mt-3 pb-0"
            style={{ wordBreak: 'break-all', height: '164px' }}
          />
          <form className="px-3 my-2 input-group input-group-sm" onSubmit={this.handleSubmit}>
            <input
              className="form-control border-secondary"
              placeholder="Type message here..."
              value={message}
              onChange={this.handleChange}
            />
            <div className="input-group-append">
              <button className="btn btn-outline-secondary" type="button" onClick={this.handleSubmit}>
                Send
              </button>
            </div>
          </form>
        </div>
        <div className="col-4 d-none d-sm-block p-0 border-left bg-white rounded-right">
          <div className="d-flex flex-direction-column flex-wrap justify-content-between">
            <div className="px-3 pt-3 pb-2 w-100">
              <p className="mb-1">{`Online users: ${users.length}`}</p>
              <div
                className="overflow-auto"
                style={{ height: '175px' }}
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
      </div>
    );
  }
}

const mapStateToProps = state => ({
  users: chatUsersSelector(state),
  messages: chatMessagesSelector(state),
  currentUser: currentChatUserSelector(state),
});

export default connect(
  mapStateToProps,
  null,
)(ChatWidget);
