import { useEffect } from "react";

import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";

import * as TournamentActions from "../middlewares/GroupTournament";
import * as selectors from "../selectors";

const useGroupTournamentChannel = (tournamentId) => {
  const dispatch = useDispatch();
  const currentUserId = useSelector(selectors.currentUserIdSelector);

  useEffect(() => {
    if (!tournamentId) {
      return undefined;
    }

    const channel = TournamentActions.setTournamentChannel(tournamentId);

    const clearTournamentChannel = () => {
      if (channel) {
        channel.leave();
      }
    };

    TournamentActions.connectToTournament(currentUserId)(dispatch);

    return clearTournamentChannel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, dispatch, tournamentId]);
};

export default useGroupTournamentChannel;
