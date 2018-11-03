import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';

class Heatmap extends React.Component {
  colorScale(count) {
    switch (count) {
      case (count > 2):
        return '123';

      default:
        return '12sdf3';
    }
  }

  render() {
    return (
      <div className="card">

        <div className="d-flex py-0 justify-content-between card-header font-weight-bold" >
              Activity
        </div>
        <div className="card-body" >
          <CalendarHeatmap
            viewBox="0 0 582 90"
            values={[
    { date: '2018-01-01', count: 3 },
    { date: '2018-01-22', count: 1 },
    { date: '2018-01-30', count: 3 },
  ]}
            classForValue={(value) => {
    if (!value) {
      return 'color-empty';
    }
    return colorScale(value.count);
  }}
          />
        </div>
      </div>
    );
  }
}
export default Heatmap;
