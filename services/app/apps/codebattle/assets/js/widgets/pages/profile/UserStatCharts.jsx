import React from "react";

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

const chartColors = {
  gold: "#e0bf7a",
  silver: "#c2c9d6",
  bronze: "#c48a57",
  platinum: "#a4aab3",
  steel: "#8a919c",
  iron: "#6f7782",
};

const gameResultNames = {
  won: "Won",
  lost: "Lost",
  gaveUp: "Gave up",
  gave_up: "Gave up",
};

const gameResultColorByKey = {
  won: chartColors.gold,
  lost: chartColors.iron,
  gaveUp: chartColors.bronze,
  gave_up: chartColors.bronze,
};

const tournamentLabels = {
  rookieWins: "Rookie",
  challengerWins: "Challenger",
  proWins: "Pro",
  eliteWins: "Elite",
  mastersWins: "Masters",
  grandSlamWins: "Grand Slam",
  rookie_wins: "Rookie",
  challenger_wins: "Challenger",
  pro_wins: "Pro",
  elite_wins: "Elite",
  masters_wins: "Masters",
  grand_slam_wins: "Grand Slam",
};

const tournamentColorByKey = {
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
  "rookieWins",
  "challengerWins",
  "proWins",
  "eliteWins",
  "mastersWins",
  "grandSlamWins",
  "rookie_wins",
  "challenger_wins",
  "pro_wins",
  "elite_wins",
  "masters_wins",
  "grand_slam_wins",
];

function UserStatCharts({ gameStats, tournamentStats }) {
  const tooltipStyle = {
    backgroundColor: "#1c1c24",
    border: "1px solid #4c4c5a",
    borderRadius: "8px",
    color: "#d7dbe6",
  };

  const tooltipLabelStyle = {
    color: "#d7dbe6",
  };

  const tooltipItemStyle = {
    color: "#d7dbe6",
  };

  const resultDataForGameBar = Object.entries(gameStats)
    .map(([key, value]) => ({
      key,
      name: gameResultNames[key] || key,
      value,
      fill: gameResultColorByKey[key] || chartColors.steel,
    }))
    .sort((a, b) => {
      if (a.key === "won") return -1;
      if (b.key === "won") return 1;
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
    <div className="row justify-content-center pb-4 px-3">
      <div className="col-12 col-lg-6 mt-4 mb-4 mb-lg-0">
        <div className="small text-center text-muted mb-2">{`Total games: ${totalGames}`}</div>
        <ResponsiveContainer
          className="text-white"
          width="100%"
          height={320}
          minWidth={1}
          minHeight={320}
        >
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
              cursor={{ fill: "transparent" }}
            />
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={100} />
            <Bar
              dataKey="value"
              name="Total games"
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
      </div>

      <div className="col-12 col-lg-6 mt-4">
        <div className="small text-center text-muted mb-2">
          {`Total tournament wins: ${totalTournamentWins}`}
        </div>
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
              cursor={{ fill: "transparent" }}
            />
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={95} />
            <Bar
              dataKey="value"
              name="Total tournament wins"
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
      </div>
    </div>
  );
}

export default UserStatCharts;
