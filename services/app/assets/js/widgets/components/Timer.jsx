import React, { Component } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';

class Timer extends Component {
  static propTypes = {
    time: PropTypes.string.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      duration: moment().format('HH:mm:ss'),
    };
  }

  componentDidMount() {
    this.interval = setInterval(this.updateTimer, 77);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  updateTimer = () => {
    const { time } = this.props;

    this.setState({
      duration: moment.utc(moment().diff(moment.utc(time))).format('HH:mm:ss'),
    });
  }

  render() {
    const { duration } = this.state;
    return <span className="text-monospace">{duration}</span>;
  }
}

export default Timer;
