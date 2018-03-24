import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import { gameTaskSelector } from '../selectors';

class InfoWidget extends Component {
  static propTypes = {
  }

  render() {
    const { taskText } = this.props;
    return (
      <div className="container-fluid">
        <div className="row row-eq-height">
          <div className="col-8">
            <div className="card mb-3">
              <div className="card-header">
                Task
              </div>
              <div className="card-body">
                <Task task={taskText} />
              </div>
            </div>
          </div>
          <div className="col-4">
            <ChatWidget />
          </div>
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
