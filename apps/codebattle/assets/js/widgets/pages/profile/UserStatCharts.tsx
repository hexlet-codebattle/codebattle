import React from 'react';

import { Grid, Text } from '@mantine/core';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';

import i18n from '../../../i18n';

const chartColors: Record<string, string> = {
  gold: '#e0bf7a',
  silver: '#c2c9d6',
  bronze: '#c48a57',
  platinum: '#a4aab3',
  steel: '#8a919c',
  iron: '#6f7782',
};

const gameResultNames: Record<string, string> = {
  won: i18n.t('Won'),
  lost: i18n.t('Lost'),
  gaveUp: i18n.t('Gave up'),
  gave_up: i18n.t('Gave up'),
};

const gameResultColorByKey: Record<string, string> = {
  won: chartColors.gold,
  lost: chartColors.iron,
  gaveUp: chartColors.bronze,
  gave_up: chartColors.bronze,
};

const tournamentLabels: Record<string, string> = {
  rookieWins: i18n.t('Rookie'),
  challengerWins: i18n.t('Challenger'),
  proWins: i18n.t('Pro'),
  eliteWins: i18n.t('Elite'),
  mastersWins: i18n.t('Masters'),
  grandSlamWins: i18n.t('Grand Slam'),
  rookie_wins: i18n.t('Rookie'),
  challenger_wins: i18n.t('Challenger'),
  pro_wins: i18n.t('Pro'),
  elite_wins: i18n.t('Elite'),
  masters_wins: i18n.t('Masters'),
  grand_slam_wins: i18n.t('Grand Slam'),
};

const tournamentColorByKey: Record<string, string> = {
  rookieWins: chartColors.iron,
  challengerWins: chartColors.steel,
  proWins: chartColors.platinum,
  eliteWins: chartColors.bronze,
  mastersWins: chartColors.silver,
  grandSlamWins: chartColors.gold,
  rookie_wins: chartColors.iron,
  challenger_wins: chartColors.steel,
  pro_wins: chartColors.platinum,
  elite_wins: chartColors.bronze,
  masters_wins: chartColors.silver,
  grand_slam_wins: chartColors.gold,
};

const tournamentOrder = [
  'rookieWins',
  'challengerWins',
  'proWins',
  'eliteWins',
  'mastersWins',
  'grandSlamWins',
  'rookie_wins',
  'challenger_wins',
  'pro_wins',
  'elite_wins',
  'masters_wins',
  'grand_slam_wins',
];

interface UserStatChartsProps {
  gameStats: Record<string, number>;
  tournamentStats: Record<string, number>;
}

function UserStatCharts({ gameStats, tournamentStats }: UserStatChartsProps) {
  const tooltipStyle = {
    backgroundColor: '#1c1c24',
    border: '1px solid #4c4c5a',
    borderRadius: '8px',
    color: '#d7dbe6',
  };

  const tooltipLabelStyle = {
    color: '#d7dbe6',
  };

  const tooltipItemStyle = {
    color: '#d7dbe6',
  };

  const resultDataForGameBar = Object.entries(gameStats)
    .map(([key, value]) => ({
      key,
      name: gameResultNames[key] || key,
      value,
      fill: gameResultColorByKey[key] || chartColors.steel,
    }))
    .sort((a, b) => {
      if (a.key === 'won') return -1;
      if (b.key === 'won') return 1;
      return a.name.localeCompare(b.name);
    });

  const resultDataForTournamentBar = Object.entries(tournamentStats)
    .map(([key, value]) => ({
      name: tournamentLabels[key] || key,
      value,
      key,
      fill: tournamentColorByKey[key] || chartColors.steel,
    }))
    .sort((a, b) => tournamentOrder.indexOf(a.key) - tournamentOrder.indexOf(b.key));

  const totalGames = resultDataForGameBar.reduce((acc, item) => acc + item.value, 0);
  const totalTournamentWins = resultDataForTournamentBar.reduce((acc, item) => acc + item.value, 0);

  return (
    <Grid justify="center" pb="lg" px="md">
      <Grid.Col span={{ base: 12, lg: 6 }} mt="lg" mb={{ base: 'lg', lg: 0 }}>
        <Text size="sm" ta="center" c="dimmed" mb="sm">
          {i18n.t('Total games: %{count}', { count: totalGames })}
        </Text>
        <ResponsiveContainer width="100%" height={320} minWidth={1} minHeight={320}>
          <BarChart
            data={resultDataForGameBar}
            margin={{
              top: 8,
              right: 20,
              left: 8,
              bottom: 8,
            }}
            layout="vertical"
          >
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              cursor={{ fill: 'transparent' }}
            />
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={100} />
            <Bar
              dataKey="value"
              name={i18n.t('Total games')}
              radius={[0, 8, 8, 0]}
              isAnimationActive
              animationDuration={900}
              animationBegin={100}
              animationEasing="ease-out"
            >
              {resultDataForGameBar.map((item) => (
                <Cell key={item.key} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Grid.Col>

      <Grid.Col span={{ base: 12, lg: 6 }} mt="lg">
        <Text size="sm" ta="center" c="dimmed" mb="sm">
          {i18n.t('Total tournament wins: %{count}', { count: totalTournamentWins })}
        </Text>
        <ResponsiveContainer width="100%" height={320} minWidth={1} minHeight={320}>
          <BarChart
            data={resultDataForTournamentBar}
            margin={{
              top: 8,
              right: 20,
              left: 8,
              bottom: 8,
            }}
            layout="vertical"
          >
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              cursor={{ fill: 'transparent' }}
            />
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={95} />
            <Bar
              dataKey="value"
              name={i18n.t('Total tournament wins')}
              radius={[0, 8, 8, 0]}
              isAnimationActive
              animationDuration={900}
              animationBegin={300}
              animationEasing="ease-out"
            >
              {resultDataForTournamentBar.map((item) => (
                <Cell key={item.key} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Grid.Col>
    </Grid>
  );
}

export default UserStatCharts;
