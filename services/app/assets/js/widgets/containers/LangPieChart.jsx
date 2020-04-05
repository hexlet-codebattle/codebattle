import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { connect } from 'react-redux';
import { loadLangStats } from '../middlewares/Users';

class LangPieChart extends React.Component {
  componentDidMount() {
    const userId = Gon.getAsset('user_id');
    console.log(userId);
    const { loadLangStats } = this.props;
    loadLangStats(userId);
  }

  render() {
    const { stats } = this.props;
    if (!stats) {
      return null;
    }
    const options = {
      chart: {
        width: 380,
        type: 'pie',
      },
      labels: Object.keys(stats),
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          },
          legend: {
            position: 'bottom'
          }
        }
      }]
    }
    const sumOfGames = Object.values(stats).reduce((acc, value) => (value + acc), 0);
    const series = Object.keys(stats).reduce((acc, lang) => {
      const amountGames = stats[lang];
      return [...acc, Number(((amountGames * 100) / sumOfGames).toFixed(1))];
    }, []);
    return (
<div id="chart">
<ReactApexChart options={options} series={series} type="pie" width={380} />
</div>
    );
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    loadLangStats: (userId) => {
      dispatch(loadLangStats)(userId);
    },
  };
}
const mapStateToProps = (state) => {
  return {stats: state.chart.stats};
}
export default connect(mapStateToProps, mapDispatchToProps)(LangPieChart);
