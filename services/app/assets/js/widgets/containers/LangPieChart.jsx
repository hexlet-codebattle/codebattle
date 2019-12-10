import React from 'react';
import axios from 'axios';
import PieChart from 'react-minimal-pie-chart';
import Loading from '../components/Loading';

const dataMock = [
  { title: 'One', value: 10, color: '#E38627' },
  { title: 'Two', value: 15, color: '#C13C37' },
  { title: 'Three', value: 20, color: '#6A2135' },
];

class LangPieChart extends React.Component {
  state = { data: null };

  componentDidMount() {
    const userId = window.location.pathname.split('/').pop();
    axios.get(`/api/v1/${userId}/lang_stats`).then((response) => {
      this.setState(response.data);
    });
  }

  render() {
    const { data } = this.state;
    if (!data) {
      return <Loading />;
    }

    return (
      <PieChart
        animate={false}
        animationDuration={500}
        animationEasing="ease-out"
        cx={50}
        cy={50}
        data={dataMock}
        label
        labelPosition={50}
        labelStyle={{
          fill: '#121212',
          fontFamily: 'sans-serif',
          fontSize: '5px',
        }}
        lengthAngle={360}
        lineWidth={100}
        onClick={undefined}
        onMouseOut={undefined}
        onMouseOver={undefined}
        paddingAngle={0}
        radius={75}
        rounded={false}
        startAngle={0}
        viewBoxSize={[100, 100]}
      />
      // TODO: Add labels table
    );
  }
}
export default LangPieChart;
