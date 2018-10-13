import React, { Component } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import PropTypes from 'prop-types';
import { gameStartsAtSelector } from '../selectors';

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;

class Timer extends Component {
  static propTypes = {
    time: PropTypes.string.isRequired,
  }

  componentDidMount() {
    this.interval = setInterval(() => this.setState({ }), getRandomInt(70, 100));
  }

  render() {
    const { time } = this.props;
    return (
      <div className="card my-2">
        <div className="card-header font-weight-bold">
          {` Starts at: ${moment.utc(time).local().format('YYYY-MM-DD HH:mm:ss')}`}
        </div>
        <div className="card-body">
          <h6 className="card-subtitle text-muted">
            {` Duration: ${moment.utc(moment().diff(moment.utc(time))).format('HH:mm:ss.SS')}`}
          </h6>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  time: gameStartsAtSelector(state),
});

export default connect(mapStateToProps)(Timer);
