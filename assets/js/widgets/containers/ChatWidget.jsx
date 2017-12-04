import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { currentUserSelector } from '../redux/UserRedux';
import { chatReady } from '../middlewares/Chat';

class ChatWidget extends React.Component {
  static propTypes = {
    currentUser: PropTypes.shape({
      id: PropTypes.number,
      type: PropTypes.string,
    }).isRequired,
    chatReady: PropTypes.func.isRequired,
  }

  componentDidMount() {
    console.log(this.props.currentUser);
    this.props.chatReady();
  }

  render() {
    return <h1>Chat Widget</h1>;
  }
}

const mapStateToProps = state => ({
  currentUser: currentUserSelector(state),
});

const mapDispatchToProps = dispatch => ({
  chatReady: () => { dispatch(chatReady()); },
});

export default connect(mapStateToProps, mapDispatchToProps)(ChatWidget);
