import React, { useMemo } from "react";

import isEmpty from "lodash/isEmpty";
import orderBy from "lodash/orderBy";
import moment from "moment";

import HorizontalScrollControls from "../../components/SideScrollControls";

import ShowButton from "./ShowButton";
import TournamentCard from "./TournamentCard";

function CompletedTournaments({ tournaments = [] }) {
  const sortedTournaments = useMemo(() => orderBy(tournaments, "startsAt", "desc"), [tournaments]);

  if (isEmpty(tournaments)) {
    return null;
  }

  return (
    <div className="table-responsive">
      <h2 className="text-center mt-3">Completed tournaments</h2>
      <div className="d-none d-md-block table-responsive rounded-bottom">
        <table className="table table-striped">
          <thead className="">
            <tr>
              <th className="p-3 border-0">Title</th>
              <th className="p-3 border-0">Type</th>
              <th className="p-3 border-0">Starts_at</th>
              <th className="p-3 border-0">Actions</th>
            </tr>
          </thead>
          <tbody className="">
            {sortedTournaments.map((tournament) => (
              <tr key={tournament.id}>
                <td className="p-3 align-middle">{tournament.name}</td>
                <td className="p-3 align-middle">{tournament.type}</td>
                <td className="p-3 align-middle text-nowrap">
                  {moment.utc(tournament.startsAt).local().format("YYYY-MM-DD HH:mm")}
                </td>
                <td className="p-3 align-middle">
                  <ShowButton url={`/tournaments/${tournament.id}/`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <HorizontalScrollControls className="d-md-none m-2">
        {sortedTournaments.map((tournament) => (
          <TournamentCard key={`card-${tournament.id}`} type="completed" tournament={tournament} />
        ))}
      </HorizontalScrollControls>
    </div>
  );
}

export default CompletedTournaments;
