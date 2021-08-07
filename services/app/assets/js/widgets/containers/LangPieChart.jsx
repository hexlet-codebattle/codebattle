import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useDispatch } from 'react-redux';
import { camelizeKeys } from 'humps';
import axios from 'axios';
import Loading from '../components/Loading';
import { actions } from '../slices';

const LangPieChart = () => {
    const [stats, setStats] = useState(null);

    const dispatch = useDispatch();

    useEffect(() => {
      const userId = window.location.pathname.split('/').pop();
      axios
      .get(`/api/v1/user/${userId}/lang_stats`)
      .then(response => setStats(camelizeKeys(response.data)))
      .catch(error => {
        dispatch(actions.setError(error));
      });
    }, [dispatch]);

      if (!stats) {
        return <Loading />;
      }

      const options = {
        chart: {
          width: 380,
          type: 'pie',
        },
        labels: Object.keys(stats.stats),
        responsive: [{
          breakpoint: 480,
          options: {
            chart: {
              width: 200,
            },
            legend: {
              position: 'bottom',
            },
          },
        }],
      };

      const sumOfGames = Object.values(stats.stats).reduce((acc, value) => (value + acc), 0);

      const series = Object.keys(stats.stats).reduce((acc, lang) => {
        const amountGames = stats.stats[lang];
        return [...acc, Number(((amountGames * 100) / sumOfGames).toFixed(1))];
      }, []);

    return (
      <div id="chart">
        <ReactApexChart options={options} series={series} type="pie" width={380} />
      </div>
    );
};
export default LangPieChart;
