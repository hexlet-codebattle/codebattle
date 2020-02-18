import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { fetchState, addMessage } from '../middlewares/Chat';
import * as selectors from '../selectors';
import Messages from '../components/Messages';
import UserName from '../components/UserName';
import GameStatusCodes from '../config/gameStatusCodes';

class ChatWidget extends React.Component {
  state = { message: '' };

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

  renderChatInput() {
    const { message: typedMessage } = this.state;

    return (
      <form className="p-2 input-group input-group-sm position-absolute" style={{ bottom: 0 }} onSubmit={this.handleSubmit}>
        <input
          className="form-control border-secondary"
          placeholder="Type message here..."
          value={typedMessage}
          onChange={this.handleChange}
        />
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
    const listOfUsers = _.uniqBy(users, 'githubId');

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
