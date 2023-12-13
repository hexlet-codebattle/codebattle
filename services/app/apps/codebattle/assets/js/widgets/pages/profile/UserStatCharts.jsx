import React from 'react';

import groupBy from 'lodash/groupBy';
import sumBy from 'lodash/sumBy';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

const colors = [
  '#8884d8',
  '#0000FF',
  '#008000',
  '#FF0000',
  '#800080',
  '#FFA500',
  '#FFC0CB',
  '#A52A2A',
  '#808080',
  '#ADD8E6',
  '#90EE90',
  '#FFB6C1',
  '#E6E6FA',
  '#FFA07A',
];

function UserStatCharts({ stats }) {
  const statByLang = groupBy(stats.all, 'lang');
  const resultDataForPie = Object.entries(statByLang)
    .map(([lang, gameStats]) => ({
      name: lang,
      value: sumBy(gameStats, 'count'),
    }))
    .sort(({ value: a }, { value: b }) => {
      if (a < b) return 1;
      if (a > b) return -1;
      return 0;
    });

  const fullMark = Math.max(...Object.values(stats.games));
  const resultDataForRadar = Object.keys(stats.games)
    .map(subject => ({
      subject,
      A: stats.games[subject],
      fullMark,
    }))
    .sort((a, b) => {
      if (a.subject === 'won') return -1;
      if (b.subject === 'won') return 1;
      if (a.subject < b.subject) return -1;
      if (a.subject > b.subject) return 1;
      return 0;
    });

  return (
    <div className="row justify-content-center pb-4">
      <div className="col-12 col-lg-7 mb-sm-n5 mb-lg-0">
        <ResponsiveContainer aspect={1}>
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="70%"
            margin={{ right: 70 }}
            data={resultDataForRadar}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis />
            <Radar
              name="count"
              dataKey="A"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
            <Tooltip contentStyle={{ padding: '0 10px' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="col-12 col-sm-8 col-md-10 col-lg-5 mt-n5 mt-lg-0 pt-lg-3">
        <ResponsiveContainer aspect={0.8}>
          <PieChart>
            <Pie
              outerRadius="70%"
              dataKey="value"
              data={resultDataForPie}
              labelLine={false}
              label
              position="inside"
            >
              {resultDataForPie.map(({ name }, index) => (
                <Cell key={`cell-${name}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default UserStatCharts;
