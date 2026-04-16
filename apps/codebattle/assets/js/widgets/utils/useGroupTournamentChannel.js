import { useEffect } from "react";

import { useDispatch } from "react-redux";

import * as TournamentActions from "../middlewares/GroupTournament";

const useGroupTournamentChannel = (tournamentId) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const channel = TournamentActions.setTournamentChannel(tournamentId);

    const clearTournamentChannel = () => {
      if (channel) {
        channel.leave();
      }
    };

    TournamentActions.connectToTournament()(dispatch);

    return clearTournamentChannel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useGroupTournamentChannel;
