import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import axios from 'axios';
import Loading from './Loading';

class GamesHeatmap extends React.Component {
  static colorScale(count) {
    if (count >= 5) {
      return 'color-huge';
    }
    if (count >= 3) {
      return 'color-large';
    }
    if (count >= 1) {
      return 'color-small';
    }
    return 'color-empty';
  }

  constructor(props) {
    super(props);
    this.state = {
      activities: null,
    };
  }

  componentDidMount() {
    axios.get('/api/v1/game_activity')
      .then((response) => { this.setState(response.data); });
  }


  render() {
    const { activities } = this.state;
    if (!activities) {
      return (<Loading />);
    }
    return (
      <div className="card shadow rounded">
        <div className="d-flex my-0 py-1 justify-content-center card-header font-weight-bold">
          Activity
        </div>
        <div className="card-body py-0 my-0">
          <CalendarHeatmap
            showWeekdayLabels
            values={activities}
            classForValue={(value) => {
              if (!value) {
                return 'color-empty';
              }
              return GamesHeatmap.colorScale(value.count);
            }}
            titleForValue={(value) => {
              if (!value) {
                return 'No games';
              }
              return `${value.count} games on ${value.date}`;
            }}
          />
        </div>
      </div>
    );
  }
}
export default GamesHeatmap;
