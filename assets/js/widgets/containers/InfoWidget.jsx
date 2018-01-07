import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import ExecutionOutput from '../components/ExecutionOutput';
import {
  gameTaskSelector,
} from '../redux/GameRedux';

const Tabs = { task: 'TASK', output: 'OUTPUT' };

class InfoWidget extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: Tabs.task,
    }
  }

  static propTypes = {
  }

  static defaultProps = {
  }

  renderTab() {
    const { taskText, outputText } = this.props;

    switch (this.state.currentTab) {
      case Tabs.task: return <Task task={taskText} />;
      case Tabs.output: return <ExecutionOutput output={outputText} />;
      default: return null;
    }
  }

  render() {
    return (
      <div className="container-fluid">
        <div className="row mt-2 mb-1">
          <div className="col">
            <div className="btn-group" role="group">
              {_.map(Tabs, (value, key) => (
                <button
                  className="btn btn-secondary"
                  type="button"
                  key={key}
                  onClick={() => this.setState({ currentTab: value })}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="row ">
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
  taskText: gameTaskSelector(state),
  outputText: state.executionOutput,
});

export default connect(mapStateToProps)(InfoWidget);
