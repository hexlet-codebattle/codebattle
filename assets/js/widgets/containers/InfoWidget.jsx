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
        <div className="row ">
          <div className="col">
            <div className="card mb-3">
              <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs">
                  {_.map(Tabs, (value, key) => {
                    const active = this.state.currentTab === value ? 'active' : '';
                    return (
                      <li className="nav-item" key={key}>
                        <a
                          href="#"
                          role="button"
                          className={`nav-link disabled ${active}`}
                          onClick={() => this.setState({ currentTab: value })}
                        >
                          {value}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="card-body">
                {this.renderTab()}
              </div>
            </div>
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
