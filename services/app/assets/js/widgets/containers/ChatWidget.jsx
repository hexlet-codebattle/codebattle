import React from 'react';
import { connect } from 'react-redux';
import 'emoji-mart/css/emoji-mart.css';
import { Picker } from 'emoji-mart';
import { fetchState, addMessage } from '../middlewares/Chat';
import { chatUsersSelector, chatMessagesSelector, currentChatUserSelector } from '../selectors';
import Messages from '../components/Messages';
import UserName from '../components/UserName';

class ChatWidget extends React.Component {
  state = { message: '', showEmoji: false };

  messagesEnd = null;

  inputRef = React.createRef();

  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(fetchState());
  }

  handleChange = (e) => {
    this.setState({ message: e.target.value });
  };

  addEmoji = (emoji) => {
    this.setState(prevState => ({ message: `${prevState.message}${emoji.native}` }), () => {
      this.closeEmoji();
      this.inputRef.current.focus();
    });
  }

  toggleEmoji = () => {
    const { showEmoji } = this.state;
    if (showEmoji) {
      this.closeEmoji();
    } else {
      this.openEmoji();
    }
  }

  openEmoji = () => {
    this.setState({
      showEmoji: true,
    }, () => document.addEventListener('click', this.closeEmojiOutsideClick, false));
  }

  closeEmoji = () => {
    this.setState({
      showEmoji: false,
    }, () => document.removeEventListener('click', this.closeEmojiOutsideClick, false));
  }

  closeEmojiOutsideClick = (e) => {
    const { target } = e;
    const isPickerEmoji = target.closest('.emoji-mart');
    if (!isPickerEmoji) {
      this.closeEmoji();
    }
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
    const { message, showEmoji } = this.state;
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
              <div
                role="button"
                tabIndex="-1"
                onClick={this.toggleEmoji}
                onKeyPress={this.toggleEmoji}
                className="d-none d-sm-block"
                style={{
                  position: 'absolute',
                  right: '65px',
                  zIndex: 10,
                  height: '31px',
                }}
              >
                <span role="img" aria-label="Emoji" style={{ position: 'relative', top: '5px' }}>😀</span>
              </div>
              {showEmoji && (
                <Picker
                  title="Pick your emoji…"
                  emoji="point_up"
                  onSelect={this.addEmoji}
                  style={{
                    position: 'absolute',
                    bottom: '50px',
                    right: '16px',
                    maxHeight: '200px',
                    overflow: 'hidden',
                  }}
                />
              )}
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
