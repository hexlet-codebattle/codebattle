import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import * as selectors from '../selectors';

class InfoWidget extends Component {
  static propTypes = {
    taskText: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }).isRequired,
    gameStatusName: PropTypes.string.isRequired,
    startsAt: PropTypes.string.isRequired,
  };

  render() {
    const { taskText, gameStatusName, startsAt } = this.props;

    return (
      <div className="row my-4">
        <div className="col-12 col-lg-6 my-2">
          <Task task={taskText} time={startsAt} gameStatusName={gameStatusName} />
        </div>
        <div className="col-12 col-lg-6 my-2">
          <ChatWidget />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  taskText: selectors.gameTaskSelector(state),
  gameStatusName: selectors.gameStatusNameSelector(state),
  startsAt: selectors.gameStartsAtSelector(state),
  // outputText: state.executionOutput,
});

export default connect(mapStateToProps)(InfoWidget);
