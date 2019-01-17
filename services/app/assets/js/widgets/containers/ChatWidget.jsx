import React from 'react';
import { connect } from 'react-redux';
import { fetchState, addMessage } from '../middlewares/Chat';
import { chatUsersSelector, chatMessagesSelector, currentChatUserSelector } from '../selectors';
import Messages from '../components/Messages';
import UserName from '../components/UserName';
import Emoji from '../components/Emoji';

class ChatWidget extends React.Component {
  state = { message: '' };

  messagesEnd = null;

  inputRef = React.createRef();

  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(fetchState());
  }

  handleChange = (e) => {
    this.setState({ message: e.target.value });
  };

  addEmoji = (emoji, closeEmoji) => {
    const { message } = this.state;
    const input = this.inputRef.current;
    const cursorPosition = input.selectionStart;
    const start = message.substring(0, input.selectionStart);
    const end = message.substring(input.selectionEnd);
    const text = `${start}${emoji.native}${end}`;

    this.setState({ message: text }, () => {
      closeEmoji();
      input.selectionEnd = cursorPosition + emoji.native.length;
      input.focus();
    });
  }

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
      <div className="d-flex shadow-sm">
        <div className="col-12 col-sm-8 p-0 bg-white rounded-left">
          <Messages
            messages={messages}
            className="overflow-auto px-3 py-3"
            style={{ height: '180px' }}
          />
          <div className="">
            <div className="px-3 my-2 input-group input-group-sm">
              <input
                className="form-control"
                type="text"
                placeholder="Type message here..."
                value={message}
                onChange={this.handleChange}
                onKeyPress={this.handleKeyPress}
                ref={this.inputRef}
              />
              <Emoji addEmoji={this.addEmoji} />
              <div className="input-group-append">
                <button className="btn btn-light border" type="button" onClick={this.sendMessage}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="col-4 d-none d-sm-block p-0 border-left bg-white rounded-right">
          <div className="d-flex flex-direction-column flex-wrap justify-content-between">
            <div className="px-3 py-3">
              <p className="mb-0">{`Online users: ${users.length}`}</p>
              <div
                className="overflow-auto"
                style={{ height: '100px' }}
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
