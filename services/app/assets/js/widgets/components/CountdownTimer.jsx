import React, { Component } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import Timer from './Timer';

// Countdown
class CountdownTimer extends Component {
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
    const { time, timeoutSeconds } = this.props;

    const diff = moment().diff(moment.utc(time));
    const timeoutMiliseconds = timeoutSeconds * 1000;
    const timeLeft = Math.max(timeoutMiliseconds - diff, 0);

    this.setState({
      duration: moment.utc(timeLeft).format('HH:mm:ss'),
    });
  }

  render() {
    const { duration } = this.state;
    return <span className="text-monospace">{duration}</span>;
  }
}

export default CountdownTimer;
