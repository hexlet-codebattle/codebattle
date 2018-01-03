import React, { Component } from 'react';
import { connect } from 'react-redux';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import ExecutionOutput from '../components/ExecutionOutput';
import {
  gameTaskSelector,
} from '../redux/GameRedux';

class InfoWidget extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'task',
    }
  }

  static propTypes = {
  }

  static defaultProps = {
  }

  renderTab() {
    const { task, output } = this.props;

    switch (this.state.currentTab) {
      case 'task': return <Task task={task} />;
      case 'output': return <ExecutionOutput output={output} />;
      default: return null;
    }
  }

  render() {
    return (
      <div className="container-fluid">
        <div className="row mt-3">
          <div className="col">
            {this.renderTab()}
          </div>
          <div className="col">
            <ChatWidget />
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  task: gameTaskSelector(state),
  output: state.executionOutput,
});

export default connect(mapStateToProps)(InfoWidget);
