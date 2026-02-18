import React, { memo, useState, useCallback, useRef } from "react";

import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from "chart.js";
import { Bubble } from "react-chartjs-2";
import { useDispatch } from "react-redux";

import { getResults } from "../../middlewares/Tournament";

import useTournamentPanel from "./useTournamentPanel";

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

function ClansChartPanel({ type, state }) {
  const dispatch = useDispatch();

  const chartRef = useRef();
  const [items, setItems] = useState([]);

  const fetchData = useCallback(
    () => dispatch(getResults(type, {}, setItems)),
    [setItems, dispatch, type],
  );

  useTournamentPanel(fetchData, state);

  const colors = ["#FF621E", "#2AE881", "#FFE500", "#B6A4FF", "#73CCFE", "#FF9C41"];

  const getBackgroundColor = (id) => {
    const index = id % colors.length;
    return colors[index];
  };

  const config = {
    data: {
      datasets: items.slice(0, 6).map((item) => ({
        label: `${item?.clanName || "undefined"} [${item?.playerCount || 0}]`,
        data: [
          {
            x: item?.totalScore || 0,
            y: item?.performance || 0,
            r: (item?.radius ?? 0) + 15,
          },
        ],
        backgroundColor: getBackgroundColor(item?.clanId),
      })),
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  };

  return (
    <div
      ref={chartRef}
      className="my-2 px-1 mt-lg-0 rounded-lg position-relative cb-overflow-x-auto cb-overflow-y-auto"
    >
      <Bubble data={config.data} options={config.options} />
    </div>
  );
}

export default memo(ClansChartPanel);
