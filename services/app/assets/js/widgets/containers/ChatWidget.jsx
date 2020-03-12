import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { Picker, Emoji } from 'emoji-mart';
import { fetchState, addMessage } from '../middlewares/Chat';
import * as selectors from '../selectors';
import Messages from '../components/Messages';
import UserName from '../components/UserName';
import GameStatusCodes from '../config/gameStatusCodes';
import 'emoji-mart/css/emoji-mart.css';

class ChatWidget extends React.Component {
  state = { message: '', isEmojiPickerVisible: false, isEmojiTooltipVisible: false };

  componentDidMount() {
    const { dispatch, isStoredGame } = this.props;
    if (!isStoredGame) {
      dispatch(fetchState());
    }
  }

  handleChange = e => {
    this.setState({ message: e.target.value });
  };

  handleSubmit = e => {
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

  toggleEmojiPickerVisibility = e => {
    e.preventDefault();
    const { isEmojiPickerVisible, ...rest } = this.state;
    this.setState({ ...rest, isEmojiPickerVisible: !isEmojiPickerVisible });
  }

  handleSelect = emoji => {
    const { message, ...rest } = this.state;
    this.setState({ ...rest, message: `${message}${emoji.native}`, isEmojiPickerVisible: false });
  }

  renderChatInput() {
    const { message: typedMessage, isEmojiPickerVisible } = this.state;

    return (
      <form className="p-2 input-group input-group-sm position-absolute" style={{ bottom: 0 }} onSubmit={this.handleSubmit}>
        <input
          className="form-control border-secondary relative"
          placeholder="Type message here..."
          value={typedMessage}
          onChange={this.handleChange}
        />
        <button
          type="button"
          className="btn btn-link position-absolute"
          style={{ right: '50px', zIndex: 10 }}
          onClick={this.toggleEmojiPickerVisibility}
        >
          <Emoji
            emoji="grinning"
            set="apple"
            size={20}
          />
        </button>
        {isEmojiPickerVisible
          && (
          <Picker
            showPreview={false}
            showSkinTones={false}
            darkMode={false}
            include={['recent']}
            perLine={10}
            onClick={this.handleSelect}
            style={{ position: 'absolute', right: '88px', bottom: '10px' }}
          />
          )}
        <div className="input-group-append">
          <button className="btn btn-outline-secondary" type="button" onClick={this.handleSubmit}>
            Send
          </button>
        </div>
      </form>
    );
  }

  render() {
    const { messages, users, isStoredGame } = this.props;
    const listOfUsers = _.uniqBy(users, 'id');

    return (
      <div className="d-flex shadow-sm h-100">
        <div className="col-12 col-sm-8 p-0 bg-white rounded-left h-100 position-relative">
          <Messages
            messages={messages}
          />
          { !isStoredGame && this.renderChatInput() }
        </div>
        <div className="col-4 d-none d-sm-block p-0 border-left bg-white rounded-right">
          <div className="d-flex flex-direction-column flex-wrap justify-content-between">
            <div className="px-3 pt-3 pb-2 w-100">
              <p className="mb-1">{`Online users: ${users.length}`}</p>
              <div
                className="overflow-auto"
                style={{ height: '175px' }}
              >
                {listOfUsers.map(user => (
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
  users: selectors.chatUsersSelector(state),
  messages: selectors.chatMessagesSelector(state),
  currentUser: selectors.currentChatUserSelector(state),
  isStoredGame: selectors.gameStatusSelector(state).status === GameStatusCodes.stored,
});

export default connect(
  mapStateToProps,
  null,
)(ChatWidget);
