import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import { gameTaskSelector } from '../selectors';

class InfoWidget extends Component {
  static propTypes = {
    taskText: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }).isRequired,
  }

  render() {
    const { taskText } = this.props;
    return (
      <div className="row mb-2">
        <div className="col-8">
          <Task task={taskText} />
        </div>
        <div className="col-4">
          <ChatWidget />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  taskText: gameTaskSelector(state),
  // outputText: state.executionOutput,
});

export default connect(mapStateToProps)(InfoWidget);
