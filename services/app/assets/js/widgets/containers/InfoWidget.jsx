import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { connect } from 'react-redux';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import Timer from '../components/Timer';
import * as selectors from '../selectors';
import GameStatusCodes from '../config/gameStatusCodes';

class InfoWidget extends Component {
  static propTypes = {
    taskText: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }).isRequired,
    gameStatusName: PropTypes.string.isRequired,
    startsAt: PropTypes.string.isRequired,
  }

  render() {
    const { taskText, gameStatusName, startsAt } = this.props;
    return (
      <div className="row mb-2" style={{ height: '35%' }}>
        <div className="col-6">
          <Task task={taskText} />
          <div className="card mt-2">
            <div className="d-flex py-0 justify-content-between card-header font-weight-bold">
              <div className="p-1">
                {` Starts at: ${moment.utc(startsAt).local().format('YYYY-MM-DD HH:mm:ss')}`}
              </div>
              <div className="p-1">
                { gameStatusName !== GameStatusCodes.gameOver ? (
                  <Timer time={startsAt} />
                ) : (
                  <div>
                    <p>{gameStatusName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-6">
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
