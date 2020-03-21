import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { fetchState, addMessage } from '../middlewares/Chat';
import * as selectors from '../selectors';
import Messages from '../components/Messages';
import UserName from '../components/UserName';
import ChatInput from '../components/ChatInput';
import GameStatusCodes from '../config/gameStatusCodes';
import 'emoji-mart/css/emoji-mart.css';


class ChatWidget extends React.Component {
  state = { message: '', isEmojiPickerVisible: false, isEmojiTooltipVisible: false };

  inputRef = React.createRef();

  componentDidMount() {
    const { dispatch, isStoredGame } = this.props;
    if (!isStoredGame) {
      dispatch(fetchState());
    }
  }

  handleChange = e => {
    const isEmojiTooltipVisible = /.*:[a-zA-Z]{1,}([^ ])+$/.test(e.target.value);
    const processedMsg = e.target.value.replace(/<br>/, '&nbsp;');
    this.setState({ message: processedMsg, isEmojiTooltipVisible });
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

  toggleEmojiPickerVisibility = () => {
    const { isEmojiPickerVisible } = this.state;
    this.setState({ isEmojiPickerVisible: !isEmojiPickerVisible });
  };

  hideEmojiPicker = () => {
    this.setState({ isEmojiPickerVisible: false });
  };

  handleSelectEmodji = emoji => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const image = new Image(20, 20);
    image.setAttribute('src', emoji.imageUrl);
    range.insertNode(image);
    const newMessage = this.chatInput.current.innerHTML;
    this.setState(() => ({ message: newMessage, isEmojiPickerVisible: false }));
    range.setStartAfter(image);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  handleInputKeydown = e => {
    const { isEmojiTooltipVisible } = this.state;
    if (e.key === 'Enter' && isEmojiTooltipVisible) {
      e.preventDefault();
    }
  }

  hideEmojiTooltip = () => this.setState({ isEmojiTooltipVisible: false });

  render() {
    const { messages, users, isStoredGame } = this.props;
    const listOfUsers = _.uniqBy(users, 'id');

    return (
      <div className="d-flex shadow-sm h-100">
        <div className="col-12 col-sm-8 p-0 bg-white rounded-left h-100 position-relative">
          <Messages messages={messages} />
          {!isStoredGame && <ChatInput innerRef={this.inputRef} />}
        </div>
        <div className="col-4 d-none d-sm-block p-0 border-left bg-white rounded-right">
          <div className="d-flex flex-direction-column flex-wrap justify-content-between">
            <div className="px-3 pt-3 pb-2 w-100">
              <p className="mb-1">{`Online users: ${users.length}`}</p>
              <div className="overflow-auto" style={{ height: '175px' }}>
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

export default connect(mapStateToProps, null)(ChatWidget);
