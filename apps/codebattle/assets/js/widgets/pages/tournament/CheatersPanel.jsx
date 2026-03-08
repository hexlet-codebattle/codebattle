import React, { memo, useMemo, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

import UserInfo from "@/components/UserInfo";
import { toggleBanUser } from "@/middlewares/TournamentAdmin";
import { tournamentPlayersSelector } from "@/selectors";

import i18next from "../../../i18n";

function CheatersPanel({ canModerate = false }) {
  const dispatch = useDispatch();
  const players = useSelector(tournamentPlayersSelector);
  const reports = useSelector((state) => state.reports.list || []);
  const [expandedPlayerIds, setExpandedPlayerIds] = useState({});

  const cheaters = useMemo(
    () =>
      Object.values(players || {})
        .filter((player) => player?.state === "banned")
        .sort((left, right) => left.name.localeCompare(right.name)),
    [players],
  );

  const reportsByOffenderId = useMemo(() => {
    const sortedReports = [...reports].sort(
      (left, right) => dayjs(right.insertedAt).valueOf() - dayjs(left.insertedAt).valueOf(),
    );

    return sortedReports.reduce((acc, report) => {
      if (!acc[report.offenderId]) {
        acc[report.offenderId] = [];
      }

      acc[report.offenderId].push(report);
      return acc;
    }, {});
  }, [reports]);

  if (!canModerate) {
    return null;
  }

  const handleToggleCheater = (userId, isBanned) => () => {
    dispatch(toggleBanUser(userId, isBanned));
  };

  const toggleReports = (playerId) => () => {
    setExpandedPlayerIds((current) => ({
      ...current,
      [playerId]: !current[playerId],
    }));
  };

  return (
    <div className="d-flex flex-column my-2">
      <div className="card cb-card border cb-border-color">
        <div className="card-header cb-bg-panel cb-text d-flex justify-content-between align-items-center">
          <span>{i18next.t("Cheaters")}</span>
          <span className="text-white-50 small">
            {i18next.t("Total")}: {cheaters.length}
          </span>
        </div>
        <div className="card-body p-0">
          {cheaters.length === 0 ? (
            <div className="p-3 text-white-50">{i18next.t("No cheaters marked yet")}</div>
          ) : (
            <table className="table cb-text-light table-striped cb-custom-event-table mb-0">
              <thead>
                <tr>
                  <th className="border-0 cb-text-light">{i18next.t("Player")}</th>
                  <th className="border-0 cb-text-light">{i18next.t("Clan")}</th>
                  <th className="border-0 cb-text-light">{i18next.t("Games")}</th>
                  <th className="border-0 cb-text-light">{i18next.t("Reports")}</th>
                  <th className="border-0 cb-text-light">{i18next.t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {cheaters.map((player) => {
                  const playerReports = reportsByOffenderId[player.id] || [];
                  const isExpanded = !!expandedPlayerIds[player.id];

                  return (
                    <React.Fragment key={`cheater-${player.id}`}>
                      <tr>
                        <td className="align-middle cb-text-light">
                          <UserInfo user={player} banned hideOnlineIndicator hideLink />
                        </td>
                        <td className="align-middle cb-text-light">{player.clan || "-"}</td>
                        <td className="align-middle cb-text-light">
                          {player.matchesIds?.length ?? player.matches_ids?.length ?? 0}
                        </td>
                        <td className="align-middle cb-text-light">
                          {playerReports.length === 0 ? (
                            <span className="text-white-50">{i18next.t("No reports yet")}</span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
                              onClick={toggleReports(player.id)}
                            >
                              <FontAwesomeIcon
                                icon={isExpanded ? "chevron-up" : "chevron-down"}
                                className="mr-2"
                              />
                              {i18next.t("Reports")} ({playerReports.length})
                            </button>
                          )}
                        </td>
                        <td className="align-middle">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={handleToggleCheater(player.id, true)}
                          >
                            {i18next.t("Unban")}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && playerReports.length > 0 && (
                        <tr>
                          <td colSpan="5" className="border-top-0 pt-0">
                            <div className="px-3 pb-3 pt-2">
                              {playerReports.map((report) => {
                                const reporter = players[report.reporterId];

                                return (
                                  <div
                                    key={`cheater-${player.id}-report-${report.id}`}
                                    className="d-flex align-items-center flex-wrap py-2 cb-text-light"
                                  >
                                    <span className="mr-3">
                                      <UserInfo user={reporter} hideOnlineIndicator hideLink />
                                    </span>
                                    <span className="mr-3 text-white-50">
                                      {dayjs(report.insertedAt).format("YYYY-MM-DD HH:mm:ss")}
                                    </span>
                                    <span className="mr-3 text-capitalize">{report.state}</span>
                                    <a
                                      href={`/games/${report.gameId}`}
                                      className="btn btn-sm btn-outline-secondary"
                                    >
                                      {i18next.t("Game")} #{report.gameId}
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CheatersPanel);
