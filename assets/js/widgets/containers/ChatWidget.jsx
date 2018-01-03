import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchState, addMessage } from '../middlewares/Chat';
import { currentUserSelector } from '../redux/UserRedux';

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

  handleChange = (event) => {
    this.setState({ message: event.target.value });
  }

  handleKeyPress = (event) => {
    const { message } = this.state;
    const { name } = this.props.currentUser;

    if (event.key === 'Enter') {
      addMessage(name, message);
      this.setState({ message: '' });
    }
  }

  render() {
    return (
      <div className="row">
        <div className="col-md-9">
          <div className="card h-100">
            <div className="card-header">Game chat</div>
            <div className="card-body">
              {this.props.messages.map(({ user, message }) => <p className="mb-1"><b>{user}:</b> {message}</p>)}
              <input
                className="form-control"
                type="text"
                value={this.state.message}
                onChange={this.handleChange}
                onKeyPress={this.handleKeyPress}
              />
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header">Online users</div>
            <div className="card-body pre-scrollable">
              <ul>
                {this.props.users.map(user => <li key={user.id}>{user.name}</li>)}
              </ul>
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

export default connect(mapStateToProps, null)(ChatWidget);
// export default ChatWidget;
