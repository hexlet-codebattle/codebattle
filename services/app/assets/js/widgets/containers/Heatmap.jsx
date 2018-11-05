import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import Loading from '../components/Loading.jsx';
import axios from 'axios';

class Heatmap extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activities: null,
    };
  }

  colorScale(count) {
    if (count >= 5) {
      return 'color-huge';
    } else if (count >= 3) {
      return 'color-large';
    } else if (count >= 1) {
      return 'color-small';
    }
    return 'color-empty';
  }

  componentDidMount() {
    axios.get('/api/v1/activity')
      .then((response) => { console.log(response.data); this.setState(response.data); });
  }

  render() {
    const { activities } = this.state;
    if (!activities) {
      return (<Loading />);
    }
    return (
      <div className="card shadow rounded">
        <div className="d-flex my-0 py-1 justify-content-center card-header font-weight-bold" >
              Activity
        </div>
        <div className="card-body py-0 my-0" >
          <CalendarHeatmap
            viewBox="0 0 0 0"
            showWeekdayLabels
            values={activities}
            classForValue={(value) => {
              if (!value) {
                return 'color-empty';
              }
              return this.colorScale(value.count);
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
export default Heatmap;
